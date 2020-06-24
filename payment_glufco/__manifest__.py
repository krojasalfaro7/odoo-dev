# -*- coding: utf-8 -*-
{
    'name': "payment_glufco",

    'summary': """Glufco Payment Acquirer""",

    'description': """
        Glufco Payment Acquirer
    """,

    'author': "edooit / Kevin Rojas",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/11.0/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['payment'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/views.xml',
        'views/templates.xml',
        'data/payment_icon_data.xml',
        'data/payment_acquirer_data.xml',
    ],
    'application': True,
}