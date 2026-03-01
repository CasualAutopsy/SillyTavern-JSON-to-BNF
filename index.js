import { event_types, eventSource, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { textgen_types, textgenerationwebui_settings } from '../../../textgen-settings.js';

import {SlashCommandParser} from '../../../slash-commands/SlashCommandParser.js';
import {SlashCommand} from '../../../slash-commands/SlashCommand.js';
import {
    ARGUMENT_TYPE,
    SlashCommandArgument,
    SlashCommandNamedArgument
} from '../../../slash-commands/SlashCommandArgument.js';

import {kobo} from '../STLib-Kobo-API-Lib/expose.js';

function trimTrailingSlash(str) {
    return str.endsWith('/') ? str.replace(/\/+$/, '') : str;
}

async function ephemeralBNF(args, value) {
    extension_settings.jsontobnf = {
        "grammar": value,
        "grammar_string": value
    };
    saveSettingsDebounced();
}

async function clearEphemeralBNF(args){
    extension_settings.jsontobnf = "";
    saveSettingsDebounced();
}

async function sendBNF(args){
    if (extension_settings.jsontobnf !== "") {
        Object.assign(args, extension_settings.jsontobnf);
    }
}

function registerEvents() {
    eventSource.on(event_types.TEXT_COMPLETION_SETTINGS_READY, sendBNF);
    eventSource.on(event_types.GENERATION_ENDED, clearEphemeralBNF);
    eventSource.on(event_types.APP_READY, clearEphemeralBNF);
}

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "json-to-grammar",
    callback: async (args,value) => {
        const result =  await kobo.extra.jsontobnf(trimTrailingSlash(textgenerationwebui_settings.server_urls[textgen_types.KOBOLDCPP]), args.apikey, value);
        return result["result"];
    },
    namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
            name: 'apikey',
            description: 'KoboldCpp API key',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: false
        })
    ],
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: 'JSON Schema',
            typeList: [ARGUMENT_TYPE.DICTIONARY],
            isRequired: true,
        })
    ],
    splitUnnamedArgument: false,
    helpString: 'Convert JSON Schemas into BNF grammars using Kobold\'s `/api/extra/json_to_grammar` endpoint.',
    returns: 'BNF grammar string'
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "ephemeral-grammar",
    aliases: ["eph-bnf"],
    callback: ephemeralBNF,
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: "BNF grammar string",
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true
        })
    ],
    splitUnnamedArgument: false,
    helpString: 'Set the grammar string for the next generation request.\n(G/E)BNF Sampler parameters are reset upon finishing a gen request.'
}));

jQuery(async () => {
    // JQuery Events
    registerEvents();
});
