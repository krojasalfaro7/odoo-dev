# -*- coding: utf-8 -*-

from odoo import models, fields, api

class chat_on_the_web(models.Model):
    _name = 'chat_on_the_web.chat_on_the_web'
    _inherit = 'mail.thread'

    name = fields.Char(string="Nombre del chatmodleo ")
    value = fields.Integer()
    value2 = fields.Float(compute="_value_pc", store=True)
    description = fields.Text()
#
    @api.depends('value')
    def _value_pc(self):
        self.value2 = float(self.value) / 100