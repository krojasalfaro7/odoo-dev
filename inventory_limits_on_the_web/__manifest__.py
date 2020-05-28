# -*- coding: utf-8 -*-
{
    'name': "inventory_limits_on_the_web",

    'summary': """
        Extension que ajusta el contenido del place holder al no ser encontrado por el xpath causando error en bloqueo de los productos con variantes""",

    'description': """
        Moificacion del template website_sale.product debido a imposibilidad de xpath de encontrar el t-placeholder que lista los productos con variantes causando error en el bloque del producto.
    """,

    'author': "Kevin Rojas",
    #'website': "http://www.yourcompany.com",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/11.0/odoo/addons/base/module/module_data.xml
    # for the full list
    #'category': 'Uncategorized',
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
