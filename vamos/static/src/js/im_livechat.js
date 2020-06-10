odoo.define('chat_window.chat_window', function (require) {
"use strict";

//var chat_mixin = require('mail.chat_mixin');
var local_storage = require('web.local_storage');
var bus = require('bus.bus').bus;
var concurrency = require('web.concurrency');
var config = require('web.config');
var core = require('web.core');
var session = require('web.session');
var time = require('web.time');
var utils = require('web.utils');
var Widget = require('web.Widget');

var dom = require('web.dom');
var ChatWindow = require('vamos.ChatWindow');
//var data = require('web.data');

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

    init: function (parent, server_url, options) {
        //console.log("=================================================init========================================");
        //console.log("_____________________________argumentos pasados a init__________________________________");
        //console.log(parent);
        //console.log(server_url);
        //console.log(options);
        //console.log("_____________________________argumentos pasados a init__________________________________");
        this._super(parent);
        this.options = _.defaults(options || {}, {
            input_placeholder: _t('Ask something ...'),
            default_username: _t("Visitor"),
            button_text: _t("Chat with one of our collaborators"),
            default_message: _t("How may I help you?"),
            isMobile: config.device.isMobile,
            context: {},
        });
        //console.log(this.options);
        this.channel = null;
        this.chat_window = null;
        this.messages = [];
        this.server_url = server_url;


        this.context = this.options.context;
        // Attachments
        //this.AttachmentDataSet = new data.DataSetSearch(this, 'ir.attachment', this.context);
        this.fileupload_id = _.uniqueId('o_chat_fileupload');
        this.set('attachment_ids', this.options.attachment_ids || []);
        //console.log("=================================================init========================================");
    },

    willStart: function () {
        //console.log("==============================================willStart=======================================");
        var self = this;
        var cookie = utils.get_cookie('im_livechat_session');
        //console.log("cookie: "+ cookie);
        var ready;
        if (!cookie) {
            //console.log("Cookie no establecido....");
            //console.log("channel_id: "+this.options.channel_id);
            ready = session.rpc("/im_livechat/init", {channel_id: this.options.channel_id}).then(function (result) {
                if (!result.available_for_me) {
                    return $.Deferred().reject();
                }
                self.rule = result.rule;
            });
        } else {
            var channel = JSON.parse(cookie);
            //console.log(channel);
            //console.log("channel: "+channel.uuid);
            ready = session.rpc("/mail/chat_history", {uuid: channel.uuid, limit: 100}).then(function (history) {
                self.history = history;
            });
        }
        //console.log("==============================================willStart=======================================");
        return ready.then(this.load_qweb_template.bind(this));
    },

    start: function () {
        //console.log("======================================start===================================================");

        //this.$el.text(this.options.button_text);
        //Editando el $el para que aparezca el icono de sobre en vez de un boton con un texto.
        this.$el.append("<input type='image' src='/vamos/static/src/img/icono_mensaje.png' class='o_input_sobre'></input>");
        var small_screen = config.device.size_class === config.device.SIZES.XS;
        if (this.history) {
            //console.log(this.history);
            //console.log(this.history.reverse());
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


        /*//Atachements
        var self = this;
        this.$attachment_button = this.$(".o_composer_button_add_attachment");
        this.$attachments_list = this.$('.o_composer_attachments_list');
        this.render_attachments();
        $(window).on(this.fileupload_id, this.on_attachment_loaded);    
        this.on("change:attachment_ids", this, this.render_attachments);
        //Atachements*/
    

        //console.log("======================================start===================================================");
        return this._super();
    },
    _on_notification: function(notification){
        //console.log("=================================_on_notification=============================================");
        if (this.channel && (notification[0] === this.channel.uuid)) {
            if(notification[1]._type === "history_command") { // history request
                var cookie = utils.get_cookie(LIVECHAT_COOKIE_HISTORY);
                var history = cookie ? JSON.parse(cookie) : [];
                session.rpc("/im_livechat/history", {
                    pid: this.channel.operator_pid[0],
                    channel_uuid: this.channel.uuid,
                    page_history: history,
                });
            }else{ // normal message
                this.add_message(notification[1]);
                this.render_messages();
                if (this.chat_window.folded || !this.chat_window.thread.is_at_bottom()) {
                    this.chat_window.update_unread(this.chat_window.unread_msgs+1);
                }
            }
        }
        //console.log("=================================_on_notification============================================="); 
    },
    load_qweb_template: function(){
        //console.log("========================================load_qweb_template======================================");
        var xml_files = ['/vamos/static/src/xml/chat_window.xml',
                         '/mail/static/src/xml/thread.xml',
                         '/vamos/static/src/xml/im_livechat.xml'];
        var defs = _.map(xml_files, function (tmpl) {
            return session.rpc('/web/proxy/load', {path: tmpl}).then(function (xml) {
                QWeb.add_template(xml);
            });
        });
        //console.log("========================================load_qweb_template======================================");
        return $.when.apply($, defs);
    },

    open_chat: _.debounce(function () {
        //console.log("open_chat");
        if (this.opening_chat) {
            return;
        }
        var self = this;
        var cookie = utils.get_cookie('im_livechat_session');
        var def;
        this.opening_chat = true;
        clearTimeout(this.auto_popup_timeout);
        if (cookie) {
            def = $.when(JSON.parse(cookie));
        } else {
            this.messages = []; // re-initialize messages cache
            def = session.rpc('/im_livechat/get_session', {
                channel_id : this.options.channel_id,
                anonymous_name : this.options.default_username,
            }, {shadow: true});
        }
        def.then(function (channel) {
            if (!channel || !channel.operator_pid) {
                alert(_t("None of our collaborators seems to be available, please try again later."));
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
        //console.log("=========================================open_chat_window===========================");
        var self = this;
        var options = {
            display_stars: false,
            placeholder: this.options.input_placeholder || "",
        };
        var is_folded = (channel.state === 'folded');
        this.chat_window = new ChatWindow(this, channel.id, channel.name, is_folded, channel.message_unread_counter, options);
        this.chat_window.appendTo($('body')).then(function () {
            self.chat_window.$el.css({right: 0, bottom: 0});
            self.$el.hide();
        });
 
        this.chat_window.on("close_chat_session", this, function () {
            var input_disabled = this.chat_window.$(".o_chat_composer input").prop('disabled');
            var ask_fb = !input_disabled && _.find(this.messages, function (msg) {
                return msg.id !== '_welcome';
            });
            if (ask_fb) {
                this.chat_window.toggle_fold(false);
                this.ask_feedback();
            } else {
                this.close_chat();
            }
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


/*
        this.chat_window.on("add_attachment_perro", this, this.on_click_add_attachment);
        this.chat_window.on("attachment_change_perro", this, this.on_attachment_change);

                //Atachements
        var self = this;
        this.chat_window.$attachment_button = this.chat_window.$(".o_composer_button_add_attachment");
        this.chat_window.$attachments_list = this.chat_window.$('.o_composer_attachments_list');
        this.render_attachments();
        this.chat_window.$(window).on(this.fileupload_id, this.on_attachment_loaded);    
        this.chat_window.on("change:attachment_ids", this, this.render_attachments);
        //Atachements
    

*/

        //console.log("=========================================open_chat_window===========================");
    },

    close_chat: function () {
        //console.log("close_chat");
        this.chat_window.destroy();
        utils.set_cookie('im_livechat_session', "", -1); // remove cookie
    },

    send_message: function (message) {
        var self = this;
        console.log("AQUI PRIEMRO")
        console.log(message.attachment_ids);

        return session
            .rpc("/vamos/chat_post", {uuid: this.channel.uuid, message_content: message.content, attachment_ids: message.attachment_ids})
            .then(function () {
                self.chat_window.thread.scroll_to();
            });

        /*return session
            .rpc("/mail/chat_post", {uuid: this.channel.uuid, message_content: message.content})
            .then(function () {
                self.chat_window.thread.scroll_to();
            });*/
    },

    add_message: function (data, options) {
        ////console.log("=================================add_message================================================");
        var msg = {
            id: data.id,
            attachment_ids: data.attachment_ids,
            //attachment_ids: this.get("attachment_ids"),
            author_id: data.author_id,
            body: data.body,
            date: moment(time.str_to_datetime(data.date)),
            is_needaction: false,
            is_note: data.is_note,
            customer_email_data: []
        };
        ////console.log(msg);
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
    //console.log("=================================add_message================================================");
    },

    render_messages: function () {
        //console.log("=====================================render_messages======================================");
        var should_scroll = !this.chat_window.folded && this.chat_window.thread.is_at_bottom();
        this.chat_window.render(this.messages);
        if (should_scroll) {
            this.chat_window.thread.scroll_to();
        }
        //console.log("=====================================render_messages======================================");
    },

    send_welcome_message: function () {
        //console.log("send_welcome_message");
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

    ask_feedback: function () {
        //console.log("ask_feedback");
        this.chat_window.$(".o_chat_composer input").prop('disabled', true);

        var feedback = new Feedback(this, this.channel.uuid);
        feedback.replace(this.chat_window.thread.$el);

        feedback.on("send_message", this, this.send_message);
        feedback.on("feedback_sent", this, this.close_chat);
    }
});

/*
 * Rating for Livechat
 *
 * This widget displays the 3 rating smileys, and a textarea to add a reason
 * (only for red smiley), and sends the user feedback to the server.
 */
var Feedback = Widget.extend({
    template: "im_livechat.FeedBack",

    events: {
        'click .o_livechat_rating_choices img': 'on_click_smiley',
        'click .o_livechat_no_feedback em': 'on_click_no_feedback',
        'click .o_rating_submit_button': 'on_click_send',
        "click .o_composer_button_add_attachment": "on_click_add_attachment",
        "change input.o_input_file": "on_attachment_change",

    },

    init: function (parent, channel_uuid) {
        this._super(parent);
        this.channel_uuid = channel_uuid;
        this.server_origin = session.origin;
        this.rating = undefined;
        this.dp = new concurrency.DropPrevious();

        this.options = {
            commands_enabled: true,
            context: {},
            input_baseline: 18,
            input_max_height: 150,
            input_min_height: 28,
            mention_fetch_limit: 8,
            mention_partners_restricted: false, // set to true to only suggest prefetched partners
            send_text: _t('Send'),
            default_body: '',
            default_mention_selections: {},
            isMobile: config.device.isMobile
        };
        this.context = this.options.context;

        // Attachments
        //this.AttachmentDataSet = new data.DataSetSearch(this, 'ir.attachment', this.context);
        this.fileupload_id = _.uniqueId('o_chat_fileupload');
        this.set('attachment_ids', this.options.attachment_ids || []);

    },


    start: function () {
        var self = this;
        this.$attachment_button = this.$(".o_composer_button_add_attachment");
        this.$attachments_list = this.$('.o_composer_attachments_list');
        this.$input = this.$('.o_composer_input textarea');
        this.$input.focus(function () {
            self.trigger('input_focused');
        });
        this.$input.val(this.options.default_body);
        dom.autoresize(this.$input, {parent: this, min_height: this.options.input_min_height});

        // Attachments
        this.render_attachments();
        $(window).on(this.fileupload_id, this.on_attachment_loaded);
        
        this.on("change:attachment_ids", this, this.render_attachments);
        

        // Mention
        //this.mention_manager.prependTo(this.$('.o_composer'));

        return this._super();
    },


        // Attachments
    on_attachment_change: function(event) {
        //console.log("==========================================on_attachment_change==============================================");
        var self = this, files = event.target.files, attachments = self.get('attachment_ids');
        //console.log(attachments);
        //console.log(files);
        //console.log(self);

        _.each(files, function(file){
            var attachment = _.findWhere(attachments, {name: file.name});
            // if the files already exits, delete the file before upload
            if(attachment){
                //self.AttachmentDataSet.unlink([attachment.id]);
                attachments = _.without(attachments, attachment);
            }
        });

        this.$('form.o_form_binary_form').submit();
        this.$attachment_button.prop('disabled', true);
        var upload_attachments = _.map(files, function(file){
            return {
                'id': 0,
                'name': file.name,
                'filename': file.name,
                'url': '',
                'upload': true,
                'mimetype': '',
            };
        });
        
        attachments = attachments.concat(upload_attachments);
        
        this.set('attachment_ids', attachments);
        
        //console.log(this.get("attachment_ids"));
        event.target.value = "";
    //console.log("==========================================on_attachment_change==============================================");
    },

    _onAttachmentDownload: function (event) {
        event.stopPropagation();
    },

    on_attachment_loaded: function(event) {
        //console.log("================================on_attachment_loaded====================================");
        var self = this,
            attachments = this.get('attachment_ids'),
            files = Array.prototype.slice.call(arguments, 1);
            //console.log(attachments);

        _.each(files, function(file){
            if(file.error || !file.id){
                this.do_warn(file.error);
                attachments = _.filter(attachments, function (attachment) { return !attachment.upload; });
            }else{
                var attachment = _.findWhere(attachments, {filename: file.filename, upload: true});
                if(attachment){
                    attachments = _.without(attachments, attachment);
                    attachments.push({
                        'id': file.id,
                        'name': file.name || file.filename,
                        'filename': file.filename,
                        'mimetype': file.mimetype,
                        'url': session.url('/web/content', {'id': file.id, download: true}),
                    });
                }
            }
        }.bind(this));
        this.set('attachment_ids', attachments);
        this.$attachment_button.prop('disabled', false);
        //console.log("================================on_attachment_loaded====================================");
    },
    on_attachment_delete: function(event){
        //console.log("on_attachment_delete");
        event.stopPropagation();
        var self = this;
        var attachment_id = $(event.target).data("id");
        if (attachment_id) {
            var attachments = [];
            _.each(this.get('attachment_ids'), function(attachment){
                if (attachment_id !== attachment.id) {
                    attachments.push(attachment);
                } else {
                    //self.AttachmentDataSet.unlink([attachment_id]);
                }
            });
            this.set('attachment_ids', attachments);
            this.$('input.o_input_file').val('');
        }
    },
    do_check_attachment_upload: function () {
        //console.log("===============================do_check_attachment_upload==============================================");
        if (_.find(this.get('attachment_ids'), function (file) { return file.upload; })) {
            this.do_warn(_t("Uploading error"), _t("Please, wait while the file is uploading."));
            return false;
        }
        return true;
        //console.log("===============================do_check_attachment_upload==============================================");
    },
    render_attachments: function() {
        //console.log("====================render_attachments========================");
        this.$attachments_list.html(QWeb.render('mail.ChatComposer.Attachments', {
            attachments: this.get('attachment_ids'),
        }));
        //console.log("====================render_attachments========================");
    },

        // Events
    on_click_add_attachment: function () {
        //console.log("====================on_click_add_attachment========================");
        this.$('input.o_input_file').click();
        this.$input.focus();
        // set ignoreEscape to avoid escape_pressed event when file selector dialog is opened
        // when user press escape to cancel file selector dialog then escape_pressed event should not be trigerred
        this.ignoreEscape = true;
        //console.log("====================on_click_add_attachment========================");
    },

    on_click_smiley: function (ev) {
        this.rating = parseInt($(ev.currentTarget).data('value'));
        this.$('.o_livechat_rating_choices img').removeClass('selected');
        this.$('.o_livechat_rating_choices img[data-value="'+this.rating+'"]').addClass('selected');

        // only display textearea if bad smiley selected
        var close_chat = false;
        if (this.rating === 1) {
            this.$('.o_livechat_rating_reason').show();
        } else {
            this.$('.o_livechat_rating_reason').hide();
            close_chat = true;
        }
        this._send_feedback({close: close_chat});
    },

    on_click_no_feedback: function () {
        this.trigger("feedback_sent"); // will close the chat
    },

    on_click_send: function () {
        if (_.isNumber(this.rating)) {
            this._send_feedback({ reason: this.$('textarea').val(), close: true });
        }
    },

    _send_feedback: function (options) {
        var self = this;
        var args = {
            uuid: this.channel_uuid,
            rate: this.rating,
            reason : options.reason
        };
        this.dp.add(session.rpc('/im_livechat/feedback', args)).then(function () {
            if (options.close) {
                var content = _.str.sprintf(_t("Rating: :rating_%d"), self.rating);
                if (options.reason) {
                    content += " \n" + options.reason;
                }
                self.trigger("send_message", {content: content});
                self.trigger("feedback_sent"); // will close the chat
            }
        });
    }
});

return {
    LivechatButton: LivechatButton,
    Feedback: Feedback,
};


});
