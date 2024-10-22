import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal } from 'obsidian';
import { ofetch } from "ofetch";


// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	url: string;
	api_key: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	url: 'https://magiedit.magitools.app',
	api_key: ""
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MagieditSettingTab(this.app, this));

		this.addCommand({
			id: 'magiedit-publish',
			name: 'Publish Selected Content',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const { publishers } = await ofetch(`${this.settings.url}/api/publishers`, {
					headers: {
						'Authorization': `Bearer ${this.settings.api_key}`
					}
				})
				new PublisherSelectModal(this.app, publishers, (ev: Record<string, any>) => {
					new Notice(`this is the list of publishers selected : ${Object.keys(ev).join(',')}`)
					const title = editor
					const value = editor.getValue()
					console.log(value)
				}).open()
			}
		})

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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

interface Publisher {
	id: number;
	name: string;
}

//TODO make the elements deletable
//Check if item is already in list
//To disable duplicates
export class PublisherSelectModal extends Modal {

	constructor(app: App, publishers: Array<Publisher>, onSubmit: (data: Record<string, string>) => void) {
		super(app)
		const selectedPublishers = {}
		const itemList = this.contentEl.createDiv()

		new Setting(this.contentEl)
			.addDropdown((dropdown) => {
				dropdown.addOption(-1, "Select at least a publisher")
				publishers.forEach((el) => {
					dropdown.addOption(String(el.id), el.name)
				})
				dropdown.onChange((value) => {
					const container = itemList.createEl('div')
					container.createEl('div', { text: publishers.find((e) => e.id == value)?.name })
					selectedPublishers[value] = container
				})
			})
		new Setting(this.contentEl)
			.addButton((btn) => {
				btn
					.setButtonText('submit')
					.setCta()
					.onClick(() => {
						onSubmit(selectedPublishers)
						this.close()
					})
			})
	}
}


class MagieditSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Magiedit Url')
			.setDesc('change this if you self-host magiedit')
			.addText(text => text
				.setPlaceholder('Enter the url of your magiedit instance')
				.setValue(this.plugin.settings.url)
				.onChange(async (value) => {
					this.plugin.settings.url = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Change to the API Key you created on your magiedit instance')
			.addText(text => text
				.setPlaceholder('Enter the api key you created  on your magiedit instance')
				.setValue(this.plugin.settings.api_key)
				.onChange(async (value) => {
					this.plugin.settings.api_key = value;
					await this.plugin.saveSettings();
				})
			)
	}
}
