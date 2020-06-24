# -*- coding: utf-8 -*-
import base64
import random
import re
from datetime import datetime, timedelta

from odoo import api, fields, models, modules, tools

class ChatWebChannel(models.Model):
    """ Livechat Channel
        Define a communication channel, which can be accessed with 'script_external' (script tag to put on
        external website), 'script_internal' (code to be integrated with odoo website) or via 'web_page' link.
        It provides rating tools, and access rules for anonymous people.
    """

    _name = 'chat_web.channel'
    _description = 'ChatWeb Channel'

    def _default_user_ids(self):
        return [(6, 0, [self._uid])]

    # attribute fields
    name = fields.Char('Name', required=True, help="The name of the channel")
    button_text = fields.Char('Text of the Button', default='Have a Question? Chat with us.',
        help="Default text displayed on the Livechat Support Button")
    default_message = fields.Char('Mensaje de Bienvenida', default='How may I help you?',
        help="This is an automated 'welcome' message that your visitor will see when they initiate a new conversation.")
    input_placeholder = fields.Char('Texto de entrada')
    no_operator_online = fields.Char('Mensaje cuando no hay operadores en linea', default="Parece que ninguno de nuestros colaboradores está disponible. Vuelve a intentarlo más tarde.")

    # computed fields
    #web_page = fields.Char('Web Page', compute='_compute_web_page_link', store=False, readonly=True,
        #help="URL to a static page where you client can discuss with the operator of the channel.")
    are_you_inside = fields.Boolean(string='Are you inside the matrix?',
        compute='_are_you_inside', store=False, readonly=True)
    #script_external = fields.Text('Script (external)', compute='_compute_script_external', store=False, readonly=True)
    nbr_channel = fields.Integer('Number of conversation', compute='_compute_nbr_channel', store=False, readonly=True)
    """rating_percentage_satisfaction = fields.Integer(
        '% Happy', compute='_compute_percentage_satisfaction', store=False, default=-1,
        help="Percentage of happy ratings over the past 7 days")"""

    # images fields
    image_medium = fields.Binary('Medium', attachment=True,
        help="Medium-sized photo of the group. It is automatically "\
             "resized as a 128x128px image, with aspect ratio preserved. "\
             "Use this field in form views or some kanban views.")
    image_small = fields.Binary('Thumbnail', attachment=True,
        help="Small-sized photo of the group. It is automatically "\
             "resized as a 64x64px image, with aspect ratio preserved. "\
             "Use this field anywhere a small image is required.")

    # relationnal fields
    user_ids = fields.Many2many('res.users', 'im_livechat_channel_im_user', 'channel_id', 'user_id', string='Operators', default=_default_user_ids)
    channel_ids = fields.One2many('mail.channel', 'livechat_channel_id', 'Sessions')
    rule_ids = fields.One2many('chat_web.channel.rule', 'channel_id', 'Rules')


    @api.one
    def _are_you_inside(self):
        self.are_you_inside = bool(self.env.uid in [u.id for u in self.user_ids])

    """@api.multi
    def _compute_web_page_link(self):
        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        for record in self:
            record.web_page = "%s/im_livechat/support/%i" % (base_url, record.id)"""

    @api.multi
    @api.depends('channel_ids')
    def _compute_nbr_channel(self):
        for record in self:
            record.nbr_channel = len(record.channel_ids)

    @api.model
    def create(self, vals):
        tools.image_resize_images(vals)
        return super(ChatWebChannel, self).create(vals)

    @api.multi
    def write(self, vals):
        tools.image_resize_images(vals)
        return super(ChatWebChannel, self).write(vals)

    # --------------------------
    # Action Methods
    # --------------------------
    @api.multi
    def action_join(self):
        self.ensure_one()
        return self.write({'user_ids': [(4, self._uid)]})

    @api.multi
    def action_quit(self):
        self.ensure_one()
        return self.write({'user_ids': [(3, self._uid)]})

    # --------------------------
    # Channel Methods
    # --------------------------
    @api.multi
    def get_available_users(self):
        """ get available user of a given channel
            :retuns : return the res.users having their im_status online
        """
        self.ensure_one()
        return self.sudo().user_ids.filtered(lambda user: user.im_status == 'online')

    @api.model
    def get_mail_channel(self, livechat_channel_id, anonymous_name):
        """ Return a mail.channel given a livechat channel. It creates one with a connected operator, or return false otherwise
            :param livechat_channel_id : the identifier if the im_livechat.channel
            :param anonymous_name : the name of the anonymous person of the channel
            :type livechat_channel_id : int
            :type anonymous_name : str
            :return : channel header
            :rtype : dict
        """
        # get the avalable user of the channel
        users = self.sudo().browse(livechat_channel_id).get_available_users()
        if len(users) == 0:
            return False
        # choose the res.users operator and get its partner id
        user = random.choice(users)
        operator_partner_id = user.partner_id.id
        # partner to add to the mail.channel
        channel_partner_to_add = [(4, operator_partner_id)]
        if self.env.user and self.env.user.active:  # valid session user (not public)
            channel_partner_to_add.append((4, self.env.user.partner_id.id))
        # create the session, and add the link with the given channel
        mail_channel = self.env["mail.channel"].with_context(mail_create_nosubscribe=False).sudo().create({
            'channel_partner_ids': channel_partner_to_add,
            'livechat_channel_id': livechat_channel_id,
            'anonymous_name': anonymous_name,
            'channel_type': 'livechat',
            'name': ', '.join([anonymous_name, user.name]),
            'public': 'private',
            'email_send': False,
        })
        mail_channel._broadcast([operator_partner_id])
        return mail_channel.sudo().with_context(im_livechat_operator_partner_id=operator_partner_id).channel_info()[0]

    @api.model
    def get_channel_infos(self, channel_id):
        channel = self.browse(channel_id)
        return {
            'button_text': channel.button_text,
            'input_placeholder': channel.input_placeholder,
            'default_message': channel.default_message,
            "channel_name": channel.name,
            "channel_id": channel.id,
            "no_operator_online" : channel.no_operator_online,
        }

    @api.model
    def get_livechat_info(self, channel_id, username='Visitante'):
        info = {}
        #info['available'] = len(self.browse(channel_id).get_available_users()) > 0
        info['server_url'] = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        info['available'] = True
        #if info['available']:
        info['options'] = self.sudo().get_channel_infos(channel_id)
        info['options']["default_username"] = username
        return info


class ChatWebChannelRule(models.Model):
    """ Channel Rules
        Rules defining access to the channel (countries, and url matching). It also provide the 'auto pop'
        option to open automatically the conversation.
    """

    _name = 'chat_web.channel.rule'
    _description = 'Channel Rules'
    _order = 'sequence asc'


    regex_url = fields.Char('URL Regex',
        help="Regular expression specifying the web pages this rule will be applied on.")
    action = fields.Selection([('display_button', 'Display the button'), ('auto_popup', 'Auto popup'), ('hide_button', 'Hide the button')],
        string='Action', required=True, default='display_button',
        help="* 'Display the button' displays the chat button on the pages.\n"\
             "* 'Auto popup' displays the button and automatically open the conversation pane.\n"\
             "* 'Hide the button' hides the chat button on the pages.")
    auto_popup_timer = fields.Integer('Auto popup timer', default=0,
        help="Delay (in seconds) to automatically open the conversation window. Note: the selected action must be 'Auto popup' otherwise this parameter will not be taken into account.")
    channel_id = fields.Many2one('chat_web.channel', 'Channel',
        help="The channel of the rule")
    country_ids = fields.Many2many('res.country', 'im_livechat_channel_country_rel', 'channel_id', 'country_id', 'Country',
        help="The rule will only be applied for these countries. Example: if you select 'Belgium' and 'United States' and that you set the action to 'Hide Button', the chat button will be hidden on the specified URL from the visitors located in these 2 countries. This feature requires GeoIP installed on your server.")
    sequence = fields.Integer('Matching order', default=10,
        help="Given the order to find a matching rule. If 2 rules are matching for the given url/country, the one with the lowest sequence will be chosen.")

    def match_rule(self, channel_id, url, country_id=False):
        """ determine if a rule of the given channel matches with the given url
            :param channel_id : the identifier of the channel_id
            :param url : the url to match with a rule
            :param country_id : the identifier of the country
            :returns the rule that matches the given condition. False otherwise.
            :rtype : im_livechat.channel.rule
        """
        def _match(rules):
            for rule in rules:
                # url might not be set because it comes from referer, in that
                # case match the first rule with no regex_url
                if re.search(rule.regex_url or '', url or ''):
                    return rule
            return False
        # first, search the country specific rules (the first match is returned)
        if country_id: # don't include the country in the research if geoIP is not installed
            domain = [('country_ids', 'in', [country_id]), ('channel_id', '=', channel_id)]
            rule = _match(self.search(domain))
            if rule:
                return rule
        # second, fallback on the rules without country
        domain = [('country_ids', '=', False), ('channel_id', '=', channel_id)]
        return _match(self.search(domain))


class Website(models.Model):

    _inherit = "website"
    channel_id = fields.Many2one('chat_web.channel', string='WebChat Channel')

class ResConfigSettings(models.TransientModel):

    _inherit = 'res.config.settings'
    channel_id = fields.Many2one('chat_web.channel', string='WebChat Channel', related='website_id.channel_id')
    has_chat_web = fields.Boolean(string='Chat Web')

    def get_has_chat_web(self):
        return self.has_chat_web


    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        get_param = self.env['ir.config_parameter'].sudo().get_param
        res.update(has_chat_web=get_param('website.has_chat_web'))
        return res

    def set_values(self):
        res = super(ResConfigSettings, self).set_values()
        set_param = self.env['ir.config_parameter'].sudo().set_param
        set_param('website.has_chat_web', self.has_chat_web)
        return res

    """@api.onchange('has_chat_web')
    def onchange_has_chat_web(self):
        if not self.has_chat_web:
            self.has_chat_web = False
        else:
            self.has_chat_web = True"""