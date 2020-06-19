# -*- coding: utf-8 -*-

import threading      #Para multiprocesos
import os             #Para crear un archivo txt y controlar la ejecucion de los hilos
import urllib.request
from telegram.ext import Updater
from telegram.ext import CommandHandler
from telegram.ext import MessageHandler, Filters

from telegram import InlineQueryResultArticle, InputTextMessageContent
from telegram.ext import InlineQueryHandler

#Creando el Updater
updater = Updater(token='1029732734:AAGr8SfOB7fjHr03xImaIyHpGHwzyZyxKhM', use_context=True)

#Instanciando un dispacher para manejar los diferentes handlers disponibles en telegram_bot
dispatcher = updater.dispatcher

def start(update, context):
    context.bot.send_message(chat_id=update.effective_chat.id, text="Soy un bot, por favor hablame!\nTu ID de Telegram es: "+str(update.effective_chat.id))

def echo(update, context):
    context.bot.send_message(chat_id=update.effective_chat.id, text=update.message.text)


def caps(update, context):
    text_caps = ' '.join(context.args).upper()
    context.bot.send_message(chat_id=update.effective_chat.id, text=text_caps)

def inline_caps(update, context):
    query = update.inline_query.query
    if not query:
        return
    results = list()
    results.append(
        InlineQueryResultArticle(
            id=query.upper(),
            title='Caps',
            input_message_content=InputTextMessageContent(query+'Algodon')
        )
    )
    context.bot.answer_inline_query(update.inline_query.id, results)


def unknown(update, context):
    context.bot.send_message(chat_id=update.effective_chat.id, text="Disculpa, no entiendo este comando")


#==================Manjedor de Mensajes=====================
echo_handler = MessageHandler(Filters.text & (~Filters.command), echo)
dispatcher.add_handler(echo_handler)

#==================Manjedor de Comandos=====================
start_handler = CommandHandler('start', start)
dispatcher.add_handler(start_handler)

caps_handler = CommandHandler('caps', caps)
dispatcher.add_handler(caps_handler)

#==================Manjedor de inline=====================
inline_caps_handler = InlineQueryHandler(inline_caps)
dispatcher.add_handler(inline_caps_handler)

#==================Manjedor de Comandos desconocidos=====================
unknown_handler = MessageHandler(Filters.command, unknown)
dispatcher.add_handler(unknown_handler)

if __name__ == "__main__":

    print("Iniciando bot...")
    updater.start_polling()
    #updater.idle()