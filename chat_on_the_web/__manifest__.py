# -*- coding: utf-8 -*-
{
    'name': "chat_on_the_web",

    'summary': """ Chat en la web""",

    'description': """
        Chat Web en Qweb para compartir información incluyendo mensajes y archivos con los diferentes pathners y clientes que lleguen a la interfaz web.
        La opción de compartir archivos solo está habilitada en el proceso de pago por transferencia""",

    'author': "edooit / Kevin Rojas",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/11.0/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['mail', 'website'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        'views/assets.xml',
        'views/templates.xml',
        'views/website_chat.xml',
        'views/res_config.xml',
        'views/views.xml',
        'data/channel_demo.xml',
    ],
    'qweb': [
        'static/src/xml/chat_window.xml',
        'static/src/xml/chat_window_backend.xml',
    ],
    'application': True,
}