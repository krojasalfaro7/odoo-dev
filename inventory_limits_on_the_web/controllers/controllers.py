# -*- coding: utf-8 -*-
from odoo import http

# class InventoryLimitsOnTheWe(http.Controller):
#     @http.route('/inventory_limits_on_the_we/inventory_limits_on_the_we/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/inventory_limits_on_the_we/inventory_limits_on_the_we/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('inventory_limits_on_the_we.listing', {
#             'root': '/inventory_limits_on_the_we/inventory_limits_on_the_we',
#             'objects': http.request.env['inventory_limits_on_the_we.inventory_limits_on_the_we'].search([]),
#         })

#     @http.route('/inventory_limits_on_the_we/inventory_limits_on_the_we/objects/<model("inventory_limits_on_the_we.inventory_limits_on_the_we"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('inventory_limits_on_the_we.object', {
#             'object': obj
#         })