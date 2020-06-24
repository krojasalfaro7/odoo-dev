odoo.define('chat_window.chat_window', function (require) {
"use strict";

var bus = require('bus.bus').bus;
var config = require('web.config');
var core = require('web.core');
var session = require('web.session');
var time = require('web.time');
var utils = require('web.utils');
var Widget = require('web.Widget');
var ChatWindow = require('ChatWeb.ChatWindow');

var _t = core._t;
var QWeb = core.qweb;

// Constants
var LIVECHAT_COOKIE_HISTORY = 'im_livechat_history';
var HISTORY_LIMIT = 15;

// History tracking
var page = window.location.href.replace(/^.*\/\/[^\/]+/, '');
var page_history = utils.get_cookie(LIVECHAT_COOKIE_HISTORY);
var url_history = [];
if(page_history){
    url_history = JSON.parse(page_history) || [];
}
if (!_.contains(url_history, page)) {
    url_history.push(page);
    while (url_history.length > HISTORY_LIMIT) {
        url_history.shift();
    }
    utils.set_cookie(LIVECHAT_COOKIE_HISTORY, JSON.stringify(url_history), 60*60*24); // 1 day cookie
}

var LivechatButton = Widget.extend({
    //className:"openerp o_livechat_button hidden-print",
    className:"o_livechat_button_image",

    events: {
        "click": "open_chat",
    },

    init: function (parent, server_url, options, is_transfer) {
        //console.log("|_________________________________init_____________________________________|");
        this._super(parent);
        this.is_transfer = is_transfer == "True" ? true : false;
        this.options = _.defaults(options || {}, {
            input_placeholder: _t('Pregunta algo ...'),
            default_username: _t("Visitante"),
            button_text: _t("Chatea con algunos de nuestros colaboradores"),
            default_message: _t("Cómo podemos ayudarte?"),
            isMobile: config.device.isMobile,
            context: {},
            no_operator_online: _t("Parece que ninguno de nuestros colaboradores está disponible. Vuelve a intentarlo más tarde."),
        });
        this.channel = null;
        this.chat_window = null;
        this.messages = [];
        this.server_url = server_url;
        this.context = this.options.context;

        // Attachments
        //this.AttachmentDataSet = new data.DataSetSearch(this, 'ir.attachment', this.context);
        this.fileupload_id = _.uniqueId('o_chat_fileupload');
        this.set('attachment_ids', this.options.attachment_ids || []);
        //console.log(this.options);
        //console.log("#_________________________________init_____________________________________#");
    },

    willStart: function () {
        //console.log("|_________________________________willStart_____________________________________|");
        var self = this;
        var cookie = utils.get_cookie('im_livechat_session');
        var ready;
        if (!cookie) {
            ready = session.rpc("/chat_web/init", {channel_id: this.options.channel_id}).then(function (result) {
                if (!result.available_for_me) {
                    return $.Deferred().reject();
                }
                self.rule = result.rule;
            });
        } else {
            var channel = JSON.parse(cookie);
            ready = session.rpc("/mail/chat_history", {uuid: channel.uuid, limit: 100}).then(function (history) {
                self.history = history;
            });
        }
        //console.log("#_________________________________willStart_____________________________________#");
        return ready.then(this.load_qweb_template.bind(this));
    },

    start: function () {
        //console.log("|_________________________________start_____________________________________|");
        //console.log(Math.round(Math.random()*(900-1)+1));
        //this.$el.text(this.options.button_text);
        //Editando el $el para que aparezca el icono de sobre en vez de un boton con un texto.
        this.$el.append("<input type='image' src='/chat_on_the_web/static/src/img/icono_mensaje.png' class='o_input_sobre'></input>");
        var small_screen = config.device.size_class === config.device.SIZES.XS;
        if (this.history) {
            _.each(this.history.reverse(), this.add_message.bind(this));
            this.open_chat();
        } else if (!small_screen && this.rule.action === 'auto_popup') {
            var auto_popup_cookie = utils.get_cookie('im_livechat_auto_popup');
            if (!auto_popup_cookie || JSON.parse(auto_popup_cookie)) {
                this.auto_popup_timeout = setTimeout(this.open_chat.bind(this), this.rule.auto_popup_timer*1000);
            }
        }
        bus.on('notification', this, function (notifications) {
            var self = this;
            _.each(notifications, function (notification) {
                self._on_notification(notification);
            });
        });
        //console.log("#_________________________________start_____________________________________#");
        return this._super();
    },
    _on_notification: function(notification){
        //console.log("|__________________________________on_notification_____________________________________|");
        if (this.channel && (notification[0] === this.channel.uuid)) {
            if(notification[1]._type === "history_command") { // history request
                var cookie = utils.get_cookie(LIVECHAT_COOKIE_HISTORY);
                var history = cookie ? JSON.parse(cookie) : [];
                session.rpc("/chat_web/history", {
                    pid: this.channel.operator_pid[0],
                    channel_uuid: this.channel.uuid,
                    page_history: history,
                });
            }else{ // normal message
                //Bucle for para establecer la url de los attachemnt que no lo tenian, aun desconoxzco porque
                for(var x in notification[1].attachment_ids){
                    notification[1].attachment_ids[x].url=session.url('/web/content', {'id': notification[1].attachment_ids[x].id, download: true})
                }
                this.add_message(notification[1]);
                this.render_messages();
                if (this.chat_window.folded || !this.chat_window.thread.is_at_bottom()) {
                    this.chat_window.update_unread(this.chat_window.unread_msgs+1);
                }
            }
        }
        //console.log("#__________________________________on_notification_____________________________________#");
    },
    load_qweb_template: function(){
        //console.log("|__________________________________load_qweb_template_____________________________________|");
        var xml_files = ['/mail/static/src/xml/thread.xml',
                        '/chat_on_the_web/static/src/xml/chat_window.xml'];
        var defs = _.map(xml_files, function (tmpl) {
            return session.rpc('/web/proxy/load', {path: tmpl}).then(function (xml) {
                QWeb.add_template(xml);
            });
        });
        //console.log("#__________________________________load_qweb_template_____________________________________#");
        return $.when.apply($, defs);
    },

    open_chat: _.debounce(function () {
        //console.log("______________________________________open_chat____________________________________________");
        if (this.opening_chat) {
            return;
        }
        var operators_online = this.options.no_operator_online; // Mensaje personalizado para cuando no hay operadores en linea
        var self = this;
        var cookie = utils.get_cookie('im_livechat_session');
        var def;
        this.opening_chat = true;
        clearTimeout(this.auto_popup_timeout);
        if (cookie) {
            def = $.when(JSON.parse(cookie));
        } else {
            this.messages = []; // re-initialize messages cache
            def = session.rpc('/chat_web/get_session', {
                channel_id : this.options.channel_id,
                anonymous_name : this.options.default_username,
            }, {shadow: true});
        }
        def.then(function (channel) {
            if (!channel || !channel.operator_pid) {
                //alert(_t("Parece que ninguno de nuestros colaboradores está disponible. Vuelve a intentarlo más tarde."));
                alert(_t(operators_online));
            } else {
                self.channel = channel;
                self.open_chat_window(channel);
                self.send_welcome_message();
                self.render_messages();

                bus.add_channel(channel.uuid);
                bus.start_polling();

                utils.set_cookie('im_livechat_session', JSON.stringify(channel), 60*60);
                utils.set_cookie('im_livechat_auto_popup', JSON.stringify(false), 60*60);
            }
        }).always(function () {
            self.opening_chat = false;
        });
    }, 200, true),

    open_chat_window: function (channel) {
        //console.log("|__________________________________open_chat_window_____________________________________|");
        var self = this;
        var options = {
            display_stars: false,
            placeholder: this.options.input_placeholder || "",
        };
        var is_folded = (channel.state === 'folded');
        this.chat_window = new ChatWindow(this, channel.id, channel.name, is_folded, channel.message_unread_counter, options, this.is_transfer);
        this.chat_window.appendTo($('body')).then(function () {
            self.chat_window.$el.css({right: 0, bottom: 0});
            self.$el.hide();
        });
 
        this.chat_window.on("close_chat_session", this, function () {
            /*var input_disabled = this.chat_window.$(".o_chat_composer input").prop('disabled');
            var ask_fb = !input_disabled && _.find(this.messages, function (msg) {
                return msg.id !== '_welcome';
            });
            if (ask_fb) {
                this.chat_window.toggle_fold(false);
            } else {
                this.close_chat();
            }*/
            this.close_chat();
        });
        this.chat_window.on("post_message", this, function (message) {
            self.send_message(message).fail(function (error, e) {
                e.preventDefault();
                return self.send_message(message); // try again just in case
            });
        });
        this.chat_window.on("fold_channel", this, function () {
            this.channel.state = (this.channel.state === 'open') ? 'folded' : 'open';
            utils.set_cookie('im_livechat_session', JSON.stringify(this.channel), 60*60);
        });
        this.chat_window.thread.$el.on("scroll", null, _.debounce(function () {
            if (self.chat_window.thread.is_at_bottom()) {
                self.chat_window.update_unread(0);
            }
        }, 100));
    //console.log("#__________________________________open_chat_window_____________________________________#");
    },

    close_chat: function () {
        //console.log("|__________________________________close_chat_____________________________________|");
        this.chat_window.destroy();
        utils.set_cookie('im_livechat_session', "", -1); // remove cookie
        //console.log("#__________________________________close_chat_____________________________________#");
    },

    send_message: function (message) {
        //console.log("|__________________________________send_message_____________________________________|");
        var self = this;
        return session
            .rpc("/chat_web/chat_post", {uuid: this.channel.uuid, message_content: message.content, attachment_ids: message.attachment_ids})
            .then(function () {
                self.chat_window.thread.scroll_to();
                self.chat_window.set('attachment_ids', []);
                self.chat_window.render_attachments();
            });
        //console.log("#__________________________________send_message_____________________________________#");
    },

    add_message: function (data, options) {
        //console.log("|__________________________________add_message_____________________________________|");
        var msg = {
            id: data.id,
            attachment_ids: data.attachment_ids,
            author_id: data.author_id,
            body: data.body,
            date: moment(time.str_to_datetime(data.date)),
            is_needaction: false,
            is_note: data.is_note,
            customer_email_data: []
        };
        var hasAlreadyMessage = _.some(this.messages, function (message) {
            return message.id === msg.id;
        });
        if (hasAlreadyMessage) {
            return;
        }
        // Compute displayed author name or email
        msg.displayed_author = msg.author_id && msg.author_id[1] || this.options.default_username;

        // Compute the avatar_url
        msg.avatar_src = this.server_url;
        if (msg.author_id && msg.author_id[0]) {
            msg.avatar_src += "/web/image/res.partner/" + msg.author_id[0] + "/image_small";
        } else {
            msg.avatar_src += "/mail/static/src/img/smiley/avatar.jpg";
        }

        if (options && options.prepend) {
            this.messages.unshift(msg);
        } else {
            this.messages.push(msg);
        }
    //console.log("#__________________________________add_message_____________________________________#");
    },

    render_messages: function () {
        //console.log("|__________________________________render_messages_____________________________________|");
        var should_scroll = !this.chat_window.folded && this.chat_window.thread.is_at_bottom();
        this.chat_window.render(this.messages);
        if (should_scroll) {
            this.chat_window.thread.scroll_to();
        }
        //console.log("#__________________________________render_messages_____________________________________#");
    },

    send_welcome_message: function () {
        if (this.options.default_message) {
            this.add_message({
                id: '_welcome',
                attachment_ids: [],
                author_id: this.channel.operator_pid,
                body: this.options.default_message,
                channel_ids: [this.channel.id],
                date: time.datetime_to_str(new Date()),
                tracking_value_ids: [],
            }, {prepend: true});
        }
    },

});
return {
    LivechatButton: LivechatButton,
};
});
