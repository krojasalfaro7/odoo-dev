# -*- coding: utf-8 -*-
from odoo import http

class Practica(http.Controller):
     @http.route('/practica/', auth='public')
     def index(self, **kw):
         return "Hello, world"

     @http.route('/practica/objects/', auth='public')
     def list(self, **kw):
         return http.request.render('practica.listing', {
             'root': 'practica',
             'objects': http.request.env['practica'].search([]),
         })

     @http.route('/practica/objects/<model("product.template"):obj>/', auth='public', website=True)
     def object(self, obj, **kw):
         return http.request.render('practica.object', {
             'object': obj
         })