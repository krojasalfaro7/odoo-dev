# -*- coding: utf-8 -*-
{
    'name': "db_routing",

    'summary': """
        Enrutamiento para base de datos extendido""",

    'description': """
        Esta extenxion mejora la seleecion de la base de datos implementadas en una instancia en odoo con redireccionamiento a cualquier otra ruta interna.
        Ademas, oculta al cliente la seleccion de las bases de datos en la pagina de login.
    """,

    'author': "Kevin Rojas",

    # Categories can be used to filter modules in modules listing
    # Check https://github.com/odoo/odoo/blob/11.0/odoo/addons/base/module/module_data.xml
    # for the full list
    'category': 'Uncategorized',
    'version': '0.1',

    # any module necessary for this one to work correctly
    'application': True,
    'depends': ['base', 'website_form'],

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
