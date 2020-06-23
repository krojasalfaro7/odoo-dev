odoo.define('chat_web.chat_client_action', function (require) {
"use strict";

require('mail.chat_client_action');
var chat_manager = require('mail.chat_manager');
var core = require('web.core');
var session = require('web.session');
var ajax = require('web.ajax');

//Variable donde se almacenara si esta activo o no el chat
var ischatenable;

async function getStatusChat() {
        ischatenable = await session.rpc("/chat_web/getEnableChat");

        core.action_registry.get('mail.chat.instant_messaging').include({
        _renderSidebar: function (options) {
            console.log("|_____________________renderSidebar_______________________________|");
            // Override to sort livechat channels by last message's date
            


            var channel_partition = _.partition(options.channels, function (channel) {
                return channel.type === 'livechat';
            });
            channel_partition[0].sort(function (c1, c2) {
                return c2.last_message_date.diff(c1.last_message_date);
            });
            options.channels = channel_partition[0].concat(channel_partition[1]);
            console.log(options.channels);
            console.log("Si llego aqui funciono entonces");
            console.log(ischatenable);

            options.ischatenable = ischatenable;

            console.log("#_____________________renderSidebar_______________________________#");
            return this._super(options);
        },
    });
}

getStatusChat();






chat_manager.bus.on('new_message', null, function (msg) {
    console.log("|____________________new_message de chat_manager_______________________________|");
    _.each(msg.channel_ids, function (channel_id) {
        var channel = chat_manager.get_channel(channel_id);
        if (channel) {
            channel.last_message_date = msg.date; // update the last message's date of the channel
        }
    console.log("#____________________new_message de chat_manager_______________________________#");
    });
});

});