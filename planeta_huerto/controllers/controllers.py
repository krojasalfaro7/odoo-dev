# -*- coding: utf-8 -*-
from odoo import http

# class Planeta.huerto(http.Controller):
#     @http.route('/planeta.huerto/planeta.huerto/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/planeta.huerto/planeta.huerto/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('planeta.huerto.listing', {
#             'root': '/planeta.huerto/planeta.huerto',
#             'objects': http.request.env['planeta.huerto.planeta.huerto'].search([]),
#         })

#     @http.route('/planeta.huerto/planeta.huerto/objects/<model("planeta.huerto.planeta.huerto"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('planeta.huerto.object', {
#             'object': obj
#         })