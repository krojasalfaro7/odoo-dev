# -*- coding: utf-8 -*-

from odoo import models, fields, api
import base64
import json

class PlanetaHuerto(models.Model):

    _name = 'planeta.huerto'
    archivo_json = fields.Binary(string="Archivo en Formato .json", attachment=True)

    @api.one
    def write(self, values):
        # Convirtiendo el archivo json a diccionario en python
        if values['archivo_json']:
            archivo = base64.b64decode(values['archivo_json']).decode()
            archivo_json = json.loads(archivo)
            self.write_sale_order(archivo_json)
        res = super().write(values)
        return res

    @api.model
    def create(self, values):
        #Convirtiendo el archivo json a diccionario en python
        if values['archivo_json']:
            archivo = base64.b64decode(values['archivo_json']).decode()
            archivo_json = json.loads(archivo)
            self.write_sale_order(archivo_json)
        res = super().create(values)
        return res


    #Escritura de pedido
    @api.model
    def write_sale_order(self, datos):
        order_line = self.env['sale.order.line'].sudo()
        order_lines = []

        #Buscando un producto generico de los ya creados
        #producto_id = self.env['product.template'].sudo().search([])[0]


        #Creando el cliente del pedido actual
        country_code = datos['data']['customer']['address']['country_code']
        country_code_id = self.env['res.country'].sudo().search([('code', '=', country_code)])

        partner_id = self.env['res.partner'].sudo().create({
            'name': datos['data']['customer']['name'] + ' ' + datos['data']['customer']['surname'],
            'email': datos['data']['customer']['email'],
            'phone': datos['data']['customer']['phone'],
            'zip': datos['data']['customer']['address']['postal_code'],
            'city': datos['data']['customer']['address']['city'],
            'street': datos['data']['customer']['address']['street'],
            'country_id': country_code_id.id
        })

        #Primero se crea la orden con el partner y luego se adiciona las lineas, ya que es requerido por sale.order.line previamente
        order = self.env['sale.order'].sudo().create(
            {
                'partner_id': partner_id.id,
            }
        )

        #Creando las lineas para la orden
        for order_line_json in datos['data']['lines']:
            producto_id = self.env['product.template'].sudo().create({
                'name': '[' + str(order_line_json['sku']) + ']' + " Producto Generico",
                #'barcode': order_line_json['barcode']
            })
            #Creando una linea de pedido
            order_lines.append(order_line.create(
                {
                    'name': order_line_json['name'],
                    'product_id': producto_id.id,
                    'product_uom_qty': order_line_json['units'],
                    'price_unit': float(order_line_json['price_unit'])/100,
                    'order_id': order.id
                }
            ).id)

        #Escribiendo las lineas de la orden preciamentes creadas dentro de order
        order.write(
            {
                'line_ids': [(6, 0, order_lines)]
            }
        )
        #Confirmando el pedido
        #Si da tiempo, colocar en name de este modelo el nombre de la orden confirmada
        order.action_confirm()
        return True