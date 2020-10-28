# -*- coding: utf-8 -*-
{
    'name': "Creación de Pedido a partir de JSON",

    'summary': """
        Módulo customizado desarrollado por Kevin Rojas para Planeta Huerto SL.
    """,

    'description': """
        Módulo que se encarga de leer un JSON y a partir de él se genera un pedido de ventas
    """,

    'author': "Kevin Rojas",
    'website': "https://www.planetahuerto.es/",

    'category': 'Uncategorized',
    'version': '0.2',

    # any module necessary for this one to work correctly
    'depends': ['base', 'sale', 'sale_management'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        'views/views.xml',
    ],
}
