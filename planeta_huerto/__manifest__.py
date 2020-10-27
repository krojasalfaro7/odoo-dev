# -*- coding: utf-8 -*-
{
    'name': "App Planeta Huerto Kevin Rojas",

    'summary': """
        Módulo customizado desarrollado por Kevin Rojas para Planeta Huerto SL.
    """,

    'description': """
        Módulo customizado desarrollado por Kevin Rojas para Planeta Huerto SL.
    """,

    'author': "Kevin Rojas",
    'website': "https://www.planetahuerto.es/",

    'category': 'Uncategorized',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'depends': ['base', 'sale_management'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        #'views/assets.xml',
        'views/views.xml',
        #'views/templates.xml',
    ],
    # only loaded in demonstration mode
    # 'demo': [
    #     'demo/demo.xml',
    # ],
}