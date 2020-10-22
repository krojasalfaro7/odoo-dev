# -*- coding: utf-8 -*-

from odoo import models, fields, api

# class /home/kevin/krojas_github/odoo-dev/odoo11/practica(models.Model):
#     _name = '/home/kevin/krojas_github/odoo-dev/odoo11/practica./home/kevin/krojas_github/odoo-dev/odoo11/practica'

#     name = fields.Char()
#     value = fields.Integer()
#     value2 = fields.Float(compute="_value_pc", store=True)
#     description = fields.Text()
#
#     @api.depends('value')
#     def _value_pc(self):
#         self.value2 = float(self.value) / 100