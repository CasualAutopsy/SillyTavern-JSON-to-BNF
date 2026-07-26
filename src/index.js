/* eslint-disable no-undef */
// @ts-nocheck
const { textgenerationwebui_settings, textgen_types } = await import(/* webpackIgnore: true */'/scripts/textgen-settings.js');

const { SlashCommandParser, SlashCommand, SlashCommandNamedArgument, SlashCommandArgument, ARGUMENT_TYPE, eventTypes, eventSource, extensionSettings, saveSettingsDebounced } = SillyTavern.getContext();
const { koboJSONtoGrammar } = NoxLib.KoboAPI.Extra;

/**
 * @typedef {import('/scripts/slash-commands/SlashCommand').NamedArguments} NamedArguments
 * @typedef {import('/scripts/slash-commands/SlashCommand').UnnamedArguments} UnnamedArguments
 */


/** The settings key */
const SETTINGS_KEY = 'jsontobnf';


/**
 * Get the BNF settings
 *
 * @returns {Object} The retrieved settings object.
 */
function getBnfSettings() {
    const settings = extensionSettings[SETTINGS_KEY];
    return typeof settings === 'object' ? settings : {};
}

/**
 * trim trailing slashes from the url.
 *
 * @param {String} url - The url to trim.
 * @returns {String} The trimmed url.
 */
function trimUrl(url) {
    return url.replace(/\/+$/, '');
}



/**
 * Clear the temporary grammar.
 */
function clearTemporaryGrammar() {
    extensionSettings[SETTINGS_KEY] = '';
    saveSettingsDebounced();
}

/**
 * Register the events
 */
async function registerEvents() {
    eventSource.on(eventTypes.TEXT_COMPLETION_SETTINGS_READY, (args) => {
        Object.assign(args, getBnfSettings());
        clearTemporaryGrammar();
    });
}

/**
 * Convert JSON Schemas into BNF grammars using Kobold's `/api/extra/json_to_grammar` endpoint.
 *
 * @param {NamedArguments} args - Named arguments and slash command scope.
 * @param {UnnamedArguments} value - JSON Schema.
 * @returns {String} BNF grammar string.
 */
async function convertJSONtoGrammar(args, value) {
    const result = await koboJSONtoGrammar(
        trimUrl(textgenerationwebui_settings.server_urls[textgen_types.KOBOLDCPP]),
        value,
        args.apikey
    );

    return result["result"];
}

/**
 * Set the temporary grammar.
 *
 * @param {NamedArguments} _ - Named arguments and slash command scope.
 * @param {UnnamedArguments} value - Grammar string.
 */
async function setTemporaryGrammar(_, value) {
    extensionSettings[SETTINGS_KEY] = {
        "grammar": value,
        "grammar_string": value
    };

    saveSettingsDebounced();
}

/**
 * Initialize the slash commands
 */
async function initGrammarCMDS() {
    /**
     * json-to-grammar
     *
     * Convert JSON Schemas into BNF grammars using Kobold's `/api/extra/json_to_grammar` endpoint
     */
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: "json-to-grammar",
        callback: convertJSONtoGrammar,
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

    /**
     * ephemeral-grammar
     *
     * Set the grammar string for the next generation request.
     * BNF Sampler parameters are reset upon finishing a gen request.
     */
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: "ephemeral-grammar",
        aliases: ["eph-bnf"],
        callback: setTemporaryGrammar,
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: "BNF grammar string",
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: true
            })
        ],
        splitUnnamedArgument: false,
        helpString: 'Set the grammar string for the next generation request.\nBNF Sampler parameters are reset upon finishing a gen request.'
    }));
}

jQuery(async () => {
    registerEvents();
    initGrammarCMDS();
});

export {};
