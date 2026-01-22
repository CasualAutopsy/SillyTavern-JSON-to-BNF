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
