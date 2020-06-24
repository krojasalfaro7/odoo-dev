odoo.define('ChatWeb.ChatWindow', function (require) {
"use strict";

var ChatThread = require('mail.ChatThread');
var config = require('web.config');
var core = require('web.core');
var Widget = require('web.Widget');
var DocumentViewer = require('mail.DocumentViewer');
var session = require('web.session');

var QWeb = core.qweb;
var _t = core._t;

var HEIGHT_OPEN = '400px';
var HEIGHT_FOLDED = '34px';

return Widget.extend({
    template: "chat_on_the_web.ChatWindow",
    custom_events: {
        escape_pressed: '_onEscapePressed',
        document_viewer_closed: '_onDocumentViewerClose',
    },
    events: {
        'click .o_chat_composer': '_onComposerClick',
        "click .o_mail_thread": "_onChatWindowClicked",
        "keydown .o_chat_composer": "on_keydown",
        "keypress .o_chat_composer": "on_keypress",
        "click .o_chat_window_close": "on_click_close",
        "click .o_chat_title": "on_click_fold",

        //Eventos que controlan la subida de archivos
        "change input.o_input_file": "on_attachment_change",
        "click .o_composer_button_add_attachment": "on_click_add_attachment",

        //Creo que faltan algunos en la vista
        "click .o_attachment_delete": "on_attachment_delete",
        "click .o_attachment_download": "_onAttachmentDownload",
        "click .o_attachment_view": "_onAttachmentView",

    },

    init: function (parent, channel_id, title, is_folded, unread_msgs, options, is_transfer) {
        this._super(parent);
        this.is_transfer = is_transfer;
        this.title = title;
        this.channel_id = channel_id;
        this.folded = is_folded;
        this.options = _.defaults(options || {}, {
            autofocus: true,
            display_stars: true,
            display_reply_icon: false,
            display_email_icon: false,
            placeholder: _t("Say something"),
            input_less: false,
        });
        this.status = this.options.status;
        this.unread_msgs = unread_msgs || 0;
        this.is_hidden = false;
        this.isMobile = config.device.isMobile;

        // Attachments
        //this.AttachmentDataSet = new data.DataSetSearch(this, 'ir.attachment', this.context);
        this.fileupload_id = _.uniqueId('o_chat_fileupload');
        this.set('attachment_ids', options.attachment_ids || []);

    },
    start: function () {
        this.$input = this.$('.o_composer_text_field');
        this.$header = this.$('.o_chat_header');

        this.thread = new ChatThread(this, {
            channel_id: this.channel_id,
            display_needactions: false,
            display_stars: this.options.display_stars,
        });
        this.thread.on('toggle_star_status', null, this.trigger.bind(this, 'toggle_star_status'));
        this.thread.on('redirect_to_channel', null, this.trigger.bind(this, 'redirect_to_channel'));
        this.thread.on('redirect', null, this.trigger.bind(this, 'redirect'));

        if (this.folded) {
            this.$el.css('height', HEIGHT_FOLDED);
        } else if (this.options.autofocus) {
            this.focus_input();
        }
        if (!config.device.isMobile) {
            this.$el.css('margin-right', $.position.scrollbarWidth());
        }
        var def = this.thread.replace(this.$('.o_chat_content'));

        this.$attachment_button = this.$(".o_composer_button_add_attachment");
        this.$attachments_list = this.$('.o_composer_attachments_list');
        // Attachments
        this.render_attachments();
        //$(window).on(this.fileupload_id, this.on_attachment_loaded); NO FUNCIONO PARA JQUERY, ASI QUE SE IMPLEMENTO PARA JAVASCRIPT

        //Este Listener atrapa el dispath que envia /chat_web/binary/upload_attachment
        window.addEventListener(this.fileupload_id, this.on_attachment_loaded);
        this.on("change:attachment_ids", this, this.render_attachments);
        return $.when(this._super(), def);

    },
    render: function (messages) {
        this.update_unread(this.unread_msgs);
        this.thread.render(messages, {display_load_more: false});
    },
    update_unread: function (counter) {
        this.unread_msgs = counter;
        this.render_header();
    },
    update_status: function (status) {
        this.status = status;
        this.render_header();
    },
    render_header: function () {
        this.$header.html(QWeb.render('mail.ChatWindowHeaderContent', {
            status: this.status,
            title: this.title,
            unread_counter: this.unread_msgs,
            widget: this,
        }));
    },
    fold: function () {
        this.$el.animate({
            height: this.folded ? HEIGHT_FOLDED : HEIGHT_OPEN
        }, 200);
    },
    toggle_fold: function (fold) {
        this.folded = _.isBoolean(fold) ? fold : !this.folded;
        if (!this.folded) {
            this.thread.scroll_to();
            this.focus_input();
        }
        this.fold();
    },
    focus_input: function () {
        if (config.device.touch && config.device.size_class <= config.device.SIZES.SM) {
            return;
        }
        this.$input.focus();
    },
    do_show: function () {
        this.is_hidden = false;
        this._super.apply(this, arguments);
    },
    do_hide: function () {
        this.is_hidden = true;
        this._super.apply(this, arguments);
    },
    do_toggle: function (display) {
        this.is_hidden = _.isBoolean(display) ? !display : !this.is_hidden;
        this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    on_keypress: function (event) {
        event.stopPropagation(); // to prevent jquery's blockUI to cancel event
    },
    on_keydown: function (event) {
        event.stopPropagation(); // to prevent jquery's blockUI to cancel event
        // ENTER key (avoid requiring jquery ui for external livechat)
        if (event.which === 13) {
            var content = _.str.trim(this.$input.val());
            var message = {
                content: content,
                attachment_ids: this.get('attachment_ids'),
                partner_ids: [],
            };
            this.$input.val('');


            if (this.is_empty(content) || !this.do_check_attachment_upload()) {
            return;
            }
            this.trigger('post_message', message, this.channel_id);
        }
    },

    is_empty: function (content) {
        return !content && !this.$('.o_attachments').children().length;
    },

    on_click_close: function (event) {
        event.stopPropagation();
        event.preventDefault();
        this.trigger("close_chat_session");
    },
    on_click_fold: function () {
        if (config.device.size_class !== config.device.SIZES.XS) {
            this.toggle_fold();
            this.trigger("fold_channel", this.channel_id, this.folded);
        }
    },
    /**
     * When a chat window is clicked on, we want to give the focus to the main
     * input. An exception is made when the user is selecting something.
     *
     * @private
     */
    _onChatWindowClicked: function () {
        var selectObj = window.getSelection();
        if (selectObj.anchorOffset === selectObj.focusOffset) {
            this.$input.focus();
        }
    },
    /**
     * Called when the composer is clicked -> forces focus on input even if
     * jquery's blockUI is enabled.
     *
     * @private
     * @param {Event} ev
     */
    _onComposerClick: function (ev) {
        if ($(ev.target).closest('a, button').length) {
            return;
        }
        this.focus_input();
    },
    _onDocumentViewerClose: function (ev) {
        this.focus_input();
    },
    /**
     * @private
     */
    _onEscapePressed: function () {
        if (!this.folded) {
            this.trigger("close_chat_session");
        }
    },

    // Attachments

    on_click_add_attachment: function () {
        console.log("|_________________________________on_click_add_attachment_____________________________________|");
        this.$('input.o_input_file').click();
        //this.$input.focus();
        // set ignoreEscape to avoid escape_pressed event when file selector dialog is opened
        // when user press escape to cancel file selector dialog then escape_pressed event should not be trigerred
        this.ignoreEscape = true;
        console.log("#_________________________________on_click_add_attachment_____________________________________#");
    },

    on_attachment_change: function(event) {
        console.log("|_________________________________on_attachment_change_____________________________________|");
        var self = this,
            files = event.target.files,
            attachments = self.get('attachment_ids');

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
        event.target.value = "";
        console.log("#_________________________________on_attachment_change_____________________________________#");
    },
    on_attachment_loaded: function(event) {
        console.log("|_________________________________on_attachment_loaded_____________________________________|");
        var self = this,
            attachments = this.get('attachment_ids'),
            files = event.pruebadedatos;

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
        console.log("#_________________________________on_attachment_loaded_____________________________________#");
    },
    on_attachment_delete: function(event){
        console.log("|_________________________________on_attachment_delete_____________________________________|");
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
        console.log("#_________________________________on_attachment_delete_____________________________________#");
    },
    do_check_attachment_upload: function () {
        console.log("|_________________________________do_check_attachment_upload_____________________________________|");
        if (_.find(this.get('attachment_ids'), function (file) { return file.upload; })) {
            alert("Uploading error\nPlease, wait while the file is uploading.");
            //this.do_warn(_t("Uploading error"), _t("Please, wait while the file is uploading."));
            ////console.log("#_________________________________do_check_attachment_upload_____________________________________#");
            return false;
        }
        console.log("#_________________________________do_check_attachment_upload_____________________________________#");
        return true;
    },
    render_attachments: function() {
        console.log("|_________________________________render_attachments_____________________________________|");
        this.$attachments_list.html(QWeb.render('mail.ChatComposer.Attachments', {
            attachments: this.get('attachment_ids'),
        }));
        console.log("#_________________________________render_attachments_____________________________________#");
    },

    _onAttachmentView: function (event) {
    console.log("|_________________________________render_attachments_____________________________________|");
    event.stopPropagation();
    var activeAttachmentID = $(event.currentTarget).data('id');
    var attachments = this.get('attachment_ids');
    if (activeAttachmentID) {
        var attachmentViewer = new DocumentViewer(this, attachments, activeAttachmentID);
        attachmentViewer.appendTo($('body'));
    }
    console.log("#_________________________________render_attachments_____________________________________#");
    },
    _onAttachmentDownload: function (event) {
        console.log("|__________________________________onAttachmentDownload_____________________________________|");
        event.stopPropagation();
        console.log("#__________________________________onAttachmentDownload_____________________________________#");
    },
});
});
