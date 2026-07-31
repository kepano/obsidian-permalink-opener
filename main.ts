import { App, parseFrontMatterEntry, Plugin, PluginSettingTab, SettingDefinitionItem } from 'obsidian';

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
				const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;
				const name = file.basename;
				let permalink = parseFrontMatterEntry(metadata, this.settings.keyName);
				if (!permalink) {
					permalink = name.toLowerCase().split(' ').join('-');
				}
				const url = this.settings.devUrl.replace(/\/+$/, '') + '/' + permalink.replace(/^\/+/, '');
				openUrl(url);
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
				const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;
				const name = file.basename;
				let permalink = parseFrontMatterEntry(metadata, this.settings.keyName);
				if (!permalink) {
					permalink = name.toLowerCase().split(' ').join('-');
				}
				const url = this.settings.prodUrl.replace(/\/+$/, '') + '/' + permalink.replace(/^\/+/, '');
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

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Permalink property name',
				desc: 'The file property used to populate the page slug',
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
