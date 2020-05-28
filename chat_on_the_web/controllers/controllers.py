# -*- coding: utf-8 -*-
from odoo import http

class ChatOnTheWeb(http.Controller):
    @http.route('/chat_on_the_web/chat_on_the_web/', auth='public')
    def index(self, **kw):
        return "Hello, world"

     @http.route('/chat_on_the_web/chat_on_the_web/objects/', auth='public')
    def list(self, **kw):
        return http.request.render('chat_on_the_web.listing', {
                    'root': '/chat_on_the_web/chat_on_the_web',
            'objects': http.request.env['chat_on_the_web.chat_on_the_web'].search([]),
        })

    @http.route('/chat_on_the_web/chat_on_the_web/objects/<model("chat_on_the_web.chat_on_the_web"):obj>/', auth='public')
    def object(self, obj, **kw):
        return http.request.render('chat_on_the_web.object', {
            'object': obj
        })