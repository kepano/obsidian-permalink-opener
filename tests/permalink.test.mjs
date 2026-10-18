import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { buildSync } from 'esbuild';

const bundle = (entry) => buildSync({
	entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs',
	external: ['obsidian'], write: false,
}).outputFiles[0].text;
const helper = { exports: {} };
vm.runInNewContext(bundle('permalink.ts'), { module: helper, exports: helper.exports });
const { parsePermalinkComment } = helper.exports;

for (const content of [
	'<!-- permalink: /manual -->\n# Manual',
	'\uFEFF\n<!--\npermalink: /manual\n-->\n# Manual',
]) {
	test('reads a leading permalink comment', () => {
		assert.equal(parsePermalinkComment(content, 'permalink'), '/manual');
	});
}

test('supports the configured property name literally', () => {
	assert.equal(parsePermalinkComment('<!-- url.path: /about -->', 'url.path'), '/about');
	assert.equal(parsePermalinkComment('<!-- urlXpath: /about -->', 'url.path'), undefined);
});

test('preserves URL punctuation and a homepage path', () => {
	assert.equal(parsePermalinkComment('<!-- permalink: / -->', 'permalink'), '/');
	assert.equal(parsePermalinkComment('<!-- permalink: /manual?mode=read#intro -->', 'permalink'), '/manual?mode=read#intro');
});

test('ignores examples, unrelated comments, empty and multiline values', () => {
	for (const content of [
		'# Example\n<!-- permalink: /wrong -->',
		'```html\n<!-- permalink: /wrong -->\n```',
		'<!-- slug: /wrong -->',
		'<!-- permalink: -->',
		'<!-- permalink: /wrong\nmore text -->',
		'<!-- permalink: /unclosed',
	]) assert.equal(parsePermalinkComment(content, 'permalink'), undefined);
});

const pluginCode = bundle('main.ts');
function fixture({ metadata, content = '', basename = 'My Note', active = true, readError = false } = {}) {
	const opened = [];
	const notices = [];
	const commands = [];
	let reads = 0;
	const file = { basename };
	const module = { exports: {} };
	const obsidian = {
		Plugin: class {}, PluginSettingTab: class {},
		Notice: class { constructor(message) { notices.push(message); } },
		parseFrontMatterEntry: (frontmatter, key) => frontmatter?.[key] ?? null,
	};
	vm.runInNewContext(pluginCode, {
		module, exports: module.exports,
		require: () => obsidian,
		window: { open: (url) => opened.push(url) },
		console: { error() {} },
	});
	const plugin = new module.exports.default();
	plugin.app = {
		workspace: { getActiveFile: () => active ? file : null },
		metadataCache: { getFileCache: () => ({ frontmatter: metadata }) },
		vault: { cachedRead: async () => {
			reads++;
			if (readError) throw new Error('Cannot read');
			return content;
		} },
	};
	plugin.loadData = async () => ({ keyName: 'permalink', devUrl: 'http://localhost:5173/', prodUrl: 'https://example.com/' });
	plugin.addCommand = (command) => commands.push(command);
	plugin.addSettingTab = () => {};
	return { plugin, opened, notices, commands, file, reads: () => reads };
}

test('YAML properties take precedence without reading the note', async () => {
	const f = fixture({ metadata: { permalink: '/from-yaml' }, content: '<!-- permalink: /from-comment -->' });
	await f.plugin.onload();
	await f.plugin.openPage(f.file, f.plugin.settings.prodUrl);
	assert.deepEqual(f.opened, ['https://example.com/from-yaml']);
	assert.equal(f.reads(), 0);
});

test('Zola YAML path supports nested output paths', async () => {
	const f = fixture({ metadata: { path: 'blog/my-post/' } });
	await f.plugin.onload();
	f.plugin.settings.keyName = 'path';
	await f.plugin.openPage(f.file, 'https://example.com');
	assert.deepEqual(f.opened, ['https://example.com/blog/my-post/']);
});

test('both commands resolve Editable comments and retain a base URL subpath', async () => {
	const f = fixture({ content: '<!-- permalink: /manual -->\n# Manual' });
	await f.plugin.onload();
	f.plugin.settings.prodUrl = 'https://example.com/site/';
	for (const command of f.commands) {
		assert.equal(command.checkCallback(true), true);
		assert.equal(f.reads(), 0);
	}
	for (const command of f.commands) assert.equal(command.checkCallback(false), true);
	await new Promise(setImmediate);
	assert.deepEqual(f.opened, ['http://localhost:5173/manual', 'https://example.com/site/manual']);
});

test('retains the filename fallback and handles the homepage', async () => {
	for (const [content, expected] of [['# Note', 'my-note'], ['<!-- permalink: / -->', '']]) {
		const f = fixture({ content });
		await f.plugin.onload();
		await f.plugin.openPage(f.file, 'https://example.com/');
		assert.deepEqual(f.opened, [`https://example.com/${expected}`]);
	}
});

test('commands are unavailable without an active file', async () => {
	const f = fixture({ active: false });
	await f.plugin.onload();
	for (const command of f.commands) {
		assert.equal(command.checkCallback(true), false);
		assert.equal(command.checkCallback(false), false);
	}
	assert.equal(f.reads(), 0);
	assert.deepEqual(f.opened, []);
});

test('reports read failures without opening an incorrect fallback URL', async () => {
	const f = fixture({ readError: true });
	await f.plugin.onload();
	await f.plugin.openPage(f.file, 'https://example.com');
	assert.equal(f.notices.length, 1);
	assert.deepEqual(f.opened, []);
});
