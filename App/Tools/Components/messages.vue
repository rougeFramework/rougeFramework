var timeOut = require('../../../rougeSettings.json').warningTimeout;
var parseMessage = require('../../utils').parseMessage;
var hash = require('object-hash');

var messagesComponent = {
	props: ['warningMessage'],
	template:
		'<div class="component-message-container">' +
		'<ul class="component-message">' +
		'<li v-for="(message, index) in messageCollection" class="_message" :class="message.type">' +
		'{{ message.text }} <span @click="deleteMessage(index)">[X]</span>' +
		'</li>' +
		'<li v-for="(message, index) in messageCollectionConfirm"  class="_message" :class="message.type">' +
		'{{ message.text }}' +
		'<div><button v-on:click="confirmCallback(message.callback, index)">Continue</button><button v-on:click="cancelCallback(index)">Cancel</button></div>' +
		'</li>' +
		'</ul>' +
		'</div>',

	data: function() {
		return {
			messageCollection: [],
			messageCollectionConfirm: [],
		};
	},
	methods: {
		/**
		 *
		 * @param {function} callback The callback after the message is valid
		 * @param {string} index
		 */
		confirmCallback: function(callback, index) {
			this.messageCollectionConfirm.splice(index, 1);

			callback();
		},
		cancelCallback: function(index) {
			this.messageCollectionConfirm.splice(index, 1);
			return;
		},
		deleteMessage: function(index) {
			this.messageCollection.splice(index, 1);
		},
		checkDuplicates: function(messageHash) {
			var hasDuplicates = false;
			this.messageCollectionConfirm.forEach(function(item) {
				if (item.hash === messageHash) {
					hasDuplicates = true;
				}
			});
			this.messageCollection.forEach(function(item) {
				if (item.hash === messageHash) {
					hasDuplicates = true;
				}
			});
			return hasDuplicates;
		},
	},

	watch: {
		messageCollection: function() {
			var self = this;
			setTimeout(function() {
				self.messageCollection.shift();
			}, timeOut);
		},

		warningMessage: function() {
			var warningMessage = parseMessage(this.warningMessage.text, this.warningMessage.textVariable);
			var messageHash = hash(this.warningMessage);
			if (this.checkDuplicates(messageHash)) {
				return;
			}
			if (this.warningMessage.callback) {
				this.messageCollectionConfirm.push({
					type: '__' + this.warningMessage.type,
					text: warningMessage,
					callback: this.warningMessage.callback,
					hash: messageHash,
				});
			} else {
				this.messageCollection.push({
					type: '__' + this.warningMessage.type,
					text: warningMessage,
					hash: messageHash,
				});
			}
		},
	},
};
module.exports = messagesComponent;
