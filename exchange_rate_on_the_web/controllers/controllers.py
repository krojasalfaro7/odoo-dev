# -*- coding: utf-8 -*-
from odoo import http

# class ExchangeRateOnTheWeb(http.Controller):
#     @http.route('/exchange_rate_on_the_web/exchange_rate_on_the_web/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/exchange_rate_on_the_web/exchange_rate_on_the_web/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('exchange_rate_on_the_web.listing', {
#             'root': '/exchange_rate_on_the_web/exchange_rate_on_the_web',
#             'objects': http.request.env['exchange_rate_on_the_web.exchange_rate_on_the_web'].search([]),
#         })

#     @http.route('/exchange_rate_on_the_web/exchange_rate_on_the_web/objects/<model("exchange_rate_on_the_web.exchange_rate_on_the_web"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('exchange_rate_on_the_web.object', {
#             'object': obj
#         })