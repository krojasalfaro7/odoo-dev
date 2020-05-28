# -*- coding: utf-8 -*-

from odoo import models, fields, api

# class inventory_limits_on_the_we(models.Model):
#     _name = 'inventory_limits_on_the_we.inventory_limits_on_the_we'

#     name = fields.Char()
#     value = fields.Integer()
#     value2 = fields.Float(compute="_value_pc", store=True)
#     description = fields.Text()
#
#     @api.depends('value')
#     def _value_pc(self):
#         self.value2 = float(self.value) / 100