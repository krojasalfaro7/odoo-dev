# -*- coding: utf-8 -*-
import base64
from odoo import http, _
from odoo.http import request
from odoo.addons.base.ir.ir_qweb import AssetsBundle
from odoo.addons.web.controllers.main import binary_content
import json

import logging
_logger = logging.getLogger(__name__)

class ChatWeb(http.Controller):

    @http.route('/chat_web/init', type='json', auth="public")
    def chat_web_init(self, channel_id):
        LivechatChannel = request.env['chat_web.channel']
        #available = len(LivechatChannel.browse(channel_id).get_available_users())
        available = True
        rule = {}
        if available:
            # find the country from the request
            country_id = False
            country_code = request.session.geoip and request.session.geoip.get('country_code') or False
            if country_code:
                country_ids = request.env['res.country'].sudo().search([('code', '=', country_code)])
                if country_ids:
                    country_id = country_ids[0].id
            # extract url
            url = request.httprequest.headers.get('Referer')
            # find the first matching rule for the given country and url
            matching_rule = request.env['chat_web.channel.rule'].sudo().match_rule(channel_id, url, country_id)
            if matching_rule:
                rule = {
                    'action': matching_rule.action,
                    'auto_popup_timer': matching_rule.auto_popup_timer,
                    'regex_url': matching_rule.regex_url,
                }
        return {
            'available_for_me': available and (not rule or rule['action'] != 'hide_button'),
            'rule': rule,
        }

    @http.route('/chat_web/get_session', type="json", auth='public')
    def get_session(self, channel_id, anonymous_name, **kwargs):
        # if geoip, add the country name to the anonymous name
        if request.session.geoip:
            anonymous_name = anonymous_name + " ("+request.session.geoip.get('country_name', "")+")"
        # if the user is identifiy (eg: portal user on the frontend), don't use the anonymous name. The user will be added to session.
        if request.session.uid:      
            anonymous_name = request.env.user.name
        return request.env["chat_web.channel"].with_context(lang=False).get_mail_channel(channel_id, anonymous_name)

    @http.route('/chat_web/get_perm_users', type="json", auth='public')
    def get_perm_users(self):
        respuesta = request.env["chat_web.channel"].get_perm_users()
        if request.session.uid:      
            respuesta.append({
                'username' : request.env.user.name,
                'user_id' : request.session.uid
                })
        else:
            respuesta.append({
                'username' : "Visitante",
                'user_id' : -3
                })
        return respuesta


    @http.route('/chat_web/history', type="json", auth="public")
    def history_pages(self, pid, channel_uuid, page_history=None):
        partner_ids = (pid, request.env.user.partner_id.id)
        channel = request.env['mail.channel'].sudo().search([('uuid', '=', channel_uuid), ('channel_partner_ids', 'in', partner_ids)])
        if channel:
            channel._send_history_message(pid, page_history)
        return True

    @http.route('/chat_web/chat_post', type="json", auth="none")
    def mail_chat_post(self, uuid, message_content, attachment_ids=None, **kwargs):
        # find the author from the user session, which can be None
        attachment_ids = [attachment_ids[x]['id'] for x in range(len(attachment_ids))]
        author_id = False  # message_post accept 'False' author_id, but not 'None'
        if request.session.uid:
            author_id = request.env['res.users'].sudo().browse(request.session.uid).partner_id.id
        # post a message without adding followers to the channel. email_from=False avoid to get author from email data
        mail_channel = request.env["mail.channel"].sudo().search([('uuid', '=', uuid)], limit=1)
        message = mail_channel.sudo().with_context(mail_create_nosubscribe=True).message_post(author_id=author_id, email_from=False, body=message_content, message_type='comment', subtype='mail.mt_comment', content_subtype='plaintext', attachment_ids=attachment_ids)
        return message and message.id or False

    @http.route('/chat_web/binary/upload_attachment', type='http', auth="user")
    def chat_web_upload_attachment(self, callback, model, id, ufile):
        files = request.httprequest.files.getlist('ufile')
        Model = request.env['ir.attachment']
        out = """<script language="javascript" type="text/javascript">
                    var event = new Event(%s);
                    event.pruebadedatos = %s;
                    window.top.window.dispatchEvent(event);
                </script>"""
        args = []
        for ufile in files:

            filename = ufile.filename
            if request.httprequest.user_agent.browser == 'safari':
                # Safari sends NFD UTF-8 (where é is composed by 'e' and [accent])
                # we need to send it the same stuff, otherwise it'll fail
                filename = unicodedata.normalize('NFD', ufile.filename)

            try:
                attachment = Model.create({
                    'name': filename,
                    'datas': base64.encodestring(ufile.read()),
                    'datas_fname': filename,
                    'res_model': model,
                    'res_id': int(id)
                })
            except Exception:
                args.append({'error': _("Something horrible happened")})
                _logger.exception("Fail to upload attachment %s" % ufile.filename)
            else:
                args.append({
                    'filename': filename,
                    'mimetype': ufile.content_type,
                    'id': attachment.id
                })
        return out % (json.dumps(callback), json.dumps(args))

    @http.route('/chat_web/getEnableChat', type="json", auth="public")
    def getEnableChat(self):
        is_enable_chat = request.env['ir.config_parameter'].sudo().get_param('website.has_chat_web')
        return is_enable_chat