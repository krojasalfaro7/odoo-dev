# -*- coding: utf-8 -*-
from odoo import http

# class SocialMedia(http.Controller):
#     @http.route('/social_media/social_media/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/social_media/social_media/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('social_media.listing', {
#             'root': '/social_media/social_media',
#             'objects': http.request.env['social_media.social_media'].search([]),
#         })

#     @http.route('/social_media/social_media/objects/<model("social_media.social_media"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('social_media.object', {
#             'object': obj
#         })