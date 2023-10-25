import { App, FrontMatterCache, parseFrontMatterEntry, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

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
				let file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (checking) return true;
				let metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;
				let name = file.basename;
				let permalink = parseFrontMatterEntry(metadata, this.settings.keyName);
				if (!permalink) {
					permalink = name.toLowerCase().split(' ').join('-');
				}
				let url = this.settings.devUrl.replace(/\/+$/, '') + '/' + permalink.replace(/^\/+/, '');
				openUrl(url);
				return true;
			}
		});

		this.addCommand({
			id: 'open-prod-url',
			name: 'Open page on live site',
			checkCallback: (checking: boolean) => {
				let file = this.app.workspace.getActiveFile();
				if (!file) return false;
				if (checking) return true;
				let metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;
				let name = file.basename;
				let permalink = parseFrontMatterEntry(metadata, this.settings.keyName);
				if (!permalink) {
					permalink = name.toLowerCase().split(' ').join('-');
				}
				let url = this.settings.prodUrl.replace(/\/+$/, '') + '/' + permalink.replace(/^\/+/, '');
				openUrl(url);
				return true;
			}
		});

		this.addSettingTab(new OpenerSettingTab(this.app, this));
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

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Permalink property name')
			.setDesc('The file property used to populate the page slug')
			.addText(text => text
				.setPlaceholder('permalink')
				.setValue(this.plugin.settings.keyName)
				.onChange(async (value) => {
					console.log('Key name: ' + value);
					this.plugin.settings.keyName = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Live site base URL')
			.setDesc('The production URL for your site')
			.addText(text => text
				.setPlaceholder('http://')
				.setValue(this.plugin.settings.prodUrl)
				.onChange(async (value) => {
					console.log('Prod URL: ' + value);
					this.plugin.settings.prodUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Development site base URL')
			.setDesc('The staging URL for your site')
			.addText(text => text
				.setPlaceholder('http://')
				.setValue(this.plugin.settings.devUrl)
				.onChange(async (value) => {
					console.log('Dev URL: ' + value);
					this.plugin.settings.devUrl = value;
					await this.plugin.saveSettings();
				}));
	}
}
