import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, requestUrl, Setting } from 'obsidian';


// Remember to rename these classes and interfaces!

interface MagieditPluginSettings {
	url: string;
	api_key: string;
}

const DEFAULT_SETTINGS: MagieditPluginSettings = {
	url: 'https://magiedit.magitools.app',
	api_key: ""
}

export default class MagieditPlugin extends Plugin {
	settings: MagieditPluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MagieditSettingTab(this.app, this));

		this.addCommand({
			id: 'magiedit-publish',
			name: 'Publish selected content',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const res = await requestUrl({
					url: `${this.settings.url}/api/publishers`,
					headers: {
						'Authorization': `Bearer ${this.settings.api_key}`
					}
				})

				const { publishers } = await res.json()				//TODO add title to frontmatter if not already available
				new PublisherSelectModal(this.app, publishers, async (ev: Record<string, any>) => {
					const title = view.file?.name.replace('.md', '')
					const value = editor.getValue()
					new Notice('Publishing article...')
					const res = await requestUrl({
						url: `${this.settings.url}/api/publishers/publish`,
						headers: {
							'Authorization': `Bearer ${this.settings.api_key}`
						},
						method: 'POST',
						body: JSON.stringify({
							'content': value,
							'publishers': Object.keys(ev)
						})
					})
					let allValid = true
					const data = await res.json()
					const values = Object.values(data.status)
					for (let i = 0; i < values.length; i++) {
						allValid = values[i] as boolean
						if (!allValid) {
							break
						}
					}
					if (allValid) {
						new Notice('The selected file has been published with all selected publishers')
					} else {
						new Notice('Not all publishers worked, sorry')
					}
				}).open()
			}
		})
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
		const selectedPublishers: Record<string, any> = {}
		const itemList = this.contentEl.createDiv()

		new Setting(this.contentEl)
			.addDropdown((dropdown) => {
				dropdown.addOption("-1", "Select at least a publisher")
				publishers.forEach((el) => {
					dropdown.addOption(String(el.id), el.name)
				})
				dropdown.onChange((value) => {
					const container = itemList.createEl('div')
					container.createEl('div', { text: publishers.find((e) => String(e.id) == value)?.name })
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
	plugin: MagieditPlugin;

	constructor(app: App, plugin: MagieditPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Magiedit URL')
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
				.setPlaceholder('Enter the API key you created  on your magiedit instance')
				.setValue(this.plugin.settings.api_key)
				.onChange(async (value) => {
					this.plugin.settings.api_key = value;
					await this.plugin.saveSettings();
				})
			)
	}
}
