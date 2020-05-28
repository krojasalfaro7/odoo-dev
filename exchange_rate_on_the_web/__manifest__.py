# -*- coding: utf-8 -*-
{
    'name': "exchange_rate_on_the_web",

    'summary': """Extension para mostrar tasas de cambio""",

    'description': """
        Modulo que extiende website_sale para mostrar las diferentes tasas de cambio en la confirmacion de pago
    """,

    'author': "Kevin Rojas",
    #'website': "http://www.yourcompany.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/11.0/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['base', 'website_form', 'website_sale'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        #'views/views.xml',
        'views/templates.xml',
    ],
    # only loaded in demonstration mode
    #'demo': [
    #    'demo/demo.xml',
    #],
}
