import { App, Notice, parseFrontMatterEntry, Plugin, PluginSettingTab, SettingDefinitionItem, TFile } from 'obsidian';
import { parsePermalinkComment } from './permalink';

interface OpenerSettings {
	keyName: string;
	devUrl: string;
	prodUrl: string;
}

const DEFAULT_SETTINGS: OpenerSettings = {
	keyName: 'permalink',
	devUrl: 'http://127.0.0.1:4000',
	prodUrl: ''
}

export const openUrl = (url: string) => {
  window.open(url);
};

export default class Opener extends Plugin {
	settings: OpenerSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'open-dev-url',
			name: 'Open page on development site',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (checking) return true;
				void this.openPage(file, this.settings.devUrl);
				return true;
			}
		});

		this.addCommand({
			id: 'open-prod-url',
			name: 'Open page on live site',
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (checking) return true;
				void this.openPage(file, this.settings.prodUrl);
				return true;
			}
		});

		this.addSettingTab(new OpenerSettingTab(this.app, this));
	}

	async openPage(file: TFile, baseUrl: string) {
		const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;
		let permalink = parseFrontMatterEntry(metadata, this.settings.keyName);
		if (!permalink) {
			try {
				const content = await this.app.vault.cachedRead(file);
				permalink = parsePermalinkComment(content, this.settings.keyName);
			} catch (error) {
				console.error('Permalink Opener: could not read note', error);
				new Notice('Could not read the note to open its permalink.');
				return;
			}
		}
		if (!permalink) {
			permalink = file.basename.toLowerCase().split(' ').join('-');
		}
		const url = baseUrl.replace(/\/+$/, '') + '/' + permalink.replace(/^\/+/, '');
		openUrl(url);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class OpenerSettingTab extends PluginSettingTab {
	plugin: Opener;

	constructor(app: App, plugin: Opener) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Permalink property name',
				desc: 'The file property or leading HTML comment key used to populate the page path',
				control: { type: 'text', key: 'keyName', placeholder: 'permalink' },
			},
			{
				name: 'Live site base URL',
				desc: 'The production URL for your site',
				control: { type: 'text', key: 'prodUrl', placeholder: 'http://' },
			},
			{
				name: 'Development site base URL',
				desc: 'The staging URL for your site',
				control: { type: 'text', key: 'devUrl', placeholder: 'http://' },
			},
		];
	}
}
