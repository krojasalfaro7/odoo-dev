# -*- coding: utf-8 -*-
{
    'name': "vamos",

    'summary': """
        ALgo""",

    'description': """
        Chat en la Web
    """,

    'author': "Kevin Rojas",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/11.0/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['base', 'mail', 'web', 'website'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/assets.xml',
        'views/templates.xml',
        'views/website_chat.xml',
        'data/channel_demo.xml',
    ],
    # only loaded in demonstration mode
    #'demo': [
    #    'demo/demo.xml',
    #],

    'qweb': [
        'static/src/xml/im_livechat.xml',
        'static/src/xml/chat_window.xml',
    ],
    'application': True,
}