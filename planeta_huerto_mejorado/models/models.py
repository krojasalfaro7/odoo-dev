# -*- coding: utf-8 -*-

from odoo import models, fields, api
import json
import os.path

class PlanetaHuerto(models.Model):

    _name = 'planeta.huerto'

    # Creacion del pedido
    @api.model
    def write_sale_order(self):
        #Leyendo el archivo .json ubicado en la raiz del modulo
        my_path = os.path.abspath(os.path.dirname(__file__))
        path = os.path.join(my_path, "../sale_order.json")
        with open(path, 'r') as file:
            datos = json.loads(file.read())

        #Inicializando las ordenes de pedido
        order_line = self.env['sale.order.line'].sudo()
        order_lines = []

        #Creando u obteniedo el cliente del pedido actual
        #Se evita la duplicacion de partners buscando por el NIF que debe ser unico
        country_code = datos['data']['customer']['address']['country_code']
        country_code_id = self.env['res.country'].sudo().search([('code', '=', country_code)])
        country_state = datos['data']['customer']['address']['province']
        country_state_id = self.env['res.country.state'].sudo().search(['&', ('name', '=', country_state), ('code', '=', country_code)])

        if len(country_state_id) == 0:
            country_state_id = self.env['res.country.state'].sudo().create({
                'name': country_state,
                'code': country_code,
                'country_id': country_code_id.id
            })

        nif = datos['data']['customer']['nif']
        partner_id = self.env['res.partner'].sudo().search([('vat', '=', nif)])
        if len(partner_id) == 0:
            partner_id = self.env['res.partner'].sudo().create({
                'name': datos['data']['customer']['name'] + ' ' + datos['data']['customer']['surname'],
                'email': datos['data']['customer']['email'],
                'phone': datos['data']['customer']['phone'],
                'vat': datos['data']['customer']['nif'],
                'zip': datos['data']['customer']['address']['postal_code'],
                'city': datos['data']['customer']['address']['city'],
                'street': datos['data']['customer']['address']['street'],
                'country_id': country_code_id.id,
                'state_id': country_state_id.id
            })

        # Primero se crea la orden con el partner y luego se adiciona las lineas, ya que es requerido por sale.order.line previamente
        order = self.env['sale.order'].sudo().create(
            {
                'partner_id': partner_id.id,
            }
        )

        # Creando las lineas para la orden
        for order_line_json in datos['data']['lines']:

            producto_id = self.env['product.template'].sudo().search([('barcode', '=', order_line_json['barcode'][0])])

            if len(producto_id) == 0:
                producto_id = self.env['product.template'].sudo().create({
                    'name': '[' + str(order_line_json['sku']) + ']' + " Producto Generico",
                    'taxes_id': [],
                    'barcode': order_line_json['barcode'][0]
                })

            # Creando una linea de pedido
            order_lines.append(order_line.create(
                {
                    'name': order_line_json['name'],
                    'product_id': producto_id.id,
                    'product_uom_qty': order_line_json['units'],
                    'price_unit': float(order_line_json['price_unit']) / 100,
                    'order_id': order.id
                }
            ).id)

        # Escribiendo las lineas de la orden preciamentes creadas dentro de order
        order.write(
            {
                'line_ids': [(6, 0, order_lines)]
            }
        )
        # Confirmando el pedido
        order.action_confirm()