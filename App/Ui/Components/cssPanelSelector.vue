var colorUtils = require('../colorHelper').colorUtils;
var template = require('./cssPanelSelector.pug').default;

colorUtils = new colorUtils();
var messages = require('../../Messages/messages.json');
var cssGenerator = require('../cssGenerator');
var generateCss = false;
var utils = require('../../utils');
var getColorFromCollection = function(instance, data) {
	if (data[0] === 'dominant') {
		return instance.colorCollection.dominantSubCollection[data[1]];
	} else if (
		data[0] === undefined ||
		data[1] === undefined ||
		!instance.colorCollection.combinationCollection[data[0]] // important for when you reduce the number of colors
	) {
		return '';
	} else {
		return instance.colorCollection.combinationCollection[data[0]].subCombination[data[1]];
	}
};
var selectorComponent = {
	data: function() {
		return {
			currentSelectorProperty: {},
			newSelector: '',
			newProperty: {},
			colorMapping: {},
			warningMessage: '',
		};
	},
	template: template,
	methods: {
		storeSelectorAndProperty: function(selector, property) {
			selector = utils.cssToJson(selector);
			this.$store.commit('currentSelector', { selector: selector, property: property });
		},

		addSelector: function(value) {
			value = utils.cssToJson(value);

			if (value in this.selectorCollection) {
				this.warningMessage = { text: messages.warnings.duplicateKey, type: 'warning', textVariable: value };
			} else {
				this.selectorCollection[value] = {};
				this.resetComponent();
			}
			value = '';
		},
		addProperty: function(value, selector) {
			value = utils.cssToJson(value);
			selector = utils.cssToJson(selector);
			if (value in this.selectorCollection[selector]) {
				this.warningMessage = { text: messages.warnings.duplicateKey, type: 'warning', textVariable: value };
			} else {
				this.selectorCollection[selector][value] = '';
				this.$store.commit('currentSelector', { selector: selector, property: value });

				this.$store.commit('selectorIndex', value + selector);
			}
		},
		getColorFromCoordinates: function(data) {
			if (utils.isHexColor(data)) {
				// if it's already an hex
				return '<div style="width:10px; height:10px; background:' + data + '"></div>';
			} else if (typeof data === 'object') {
				var selectedColor = getColorFromCollection(this, data);
				selectedColor = colorUtils.hslToHex(selectedColor).getString();
				this.colorMapping[JSON.stringify(data)] = selectedColor;
				return '<div style="width:10px; height:10px; background:' + selectedColor + '"></div>';
			} else {
				return data;
			}
		},
		deleteProperty: function(selector, property) {
			var self = this;
			this.warningMessage = {
				text: 'Are you sure you want to delete ?',
				type: 'warning',
				callback: function() {
					delete self.selectorCollection[selector][property];
					self.resetComponent();
				},
			};
		},
		deleteSelector: function(selector) {
			var self = this;
			this.warningMessage = {
				text: "Are you sure you want to delete %s and all it's properties ?",
				type: 'warning',
				textVariable: selector,
				callback: function() {
					delete self.selectorCollection[selector];
					self.resetComponent();
				},
			};
		},
		resetComponent: function() {
			var index = this.selectorIndex === 1 ? 0 : 1;
			this.$store.commit('selectorIndex', index);
		},
		jsonToCss: function(text) {
			return utils.jsonToCss(text);
		},
		saveEdit: function(coordinates, event) {
			var value = utils.cssToJson(event.target.innerHTML);
			if (coordinates.value) {
				this.selectorCollection[coordinates.selector][coordinates.property] = event.target.innerHTML;
			} else if (coordinates.property) {
				this.selectorCollection[coordinates.selector][value] = this.selectorCollection[coordinates.selector][
					coordinates.property
				];
				delete this.selectorCollection[coordinates.selector][coordinates.property];
			} else {
				this.selectorCollection[value] = this.selectorCollection[coordinates.selector];
				delete this.selectorCollection[coordinates.selector];
			}

			this.resetComponent();
		},
	},
	mounted: function() {
		generateCss.apply(this.selectorCollection, this.colorMapping);
	},
	computed: {
		colorCollection: function() {
			return this.$store.getters.colorCollection;
		},
		selectorCollection: function() {
			generateCss = new cssGenerator.generateCss(this.$store.getters.selectorCollection);
			return this.$store.getters.selectorCollection;
		},
		selectorIndex: function() {
			return this.$store.getters.selectorIndex;
		},
	},
	//TODO : that's confusing to have the master style updater here
	updated: function() {
		var self = this;
		this.$nextTick(function() {
			generateCss.apply(self.selectorCollection, self.colorMapping);
		});
	},
};
module.exports = selectorComponent;
