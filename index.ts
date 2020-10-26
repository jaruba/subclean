#! /usr/bin/env node
import * as fs from 'fs';
import { dirname, join, resolve, extname } from 'path';
import { parseSync, stringifySync } from 'subtitle';

const argv = require('minimist')(process.argv.slice(2));

class Subclean {
    public args: any;

    constructor() {}

    init() {
        this.prepare();
        this.validate();
        this.clean();
    }

    /**
     * Kill the script after printing an error
     * @param e Error Message
     */
    kill(e: string) {
        console.error(`[Error] ${e}`);
        process.exit(0);
    }

    /**
     * Prepare the arguments and defaults
     */
    prepare() {
        if (!argv._.length && !argv.i) this.kill('Missing arguments');

        // Parse the required arguments from short or long parameters
        this.args = {
            input: argv._.shift() || argv.i || argv['input-file'] || '',
            output: argv.o || argv['output-file'] || '',
            continue: argv.c || argv.continue || false,
            directory: argv.d || '',
            ext: 'srt',
            filter: argv.filter || argv.f || 'main',
            _filter: '',
            clean: argv.clean || false,
            debug: argv.debug || false,
        };

        if (this.args.debug) console.log('prepared arguments');
    }

    /**
     * Attempt to validate files and arguments
     */
    validate() {
        // Resolve input
        this.args.input = resolve(this.args.input);

        // Detect the directory and file extension
        this.args.directory = dirname(this.args.input);
        this.args.ext = extname(this.args.input);

        // If an output file is not set, generate a default path
        if (this.args.output === '') {
            this.args.output = join(
                this.args.directory,
                `output${this.args.ext}`
            );
        }

        // Use -debug
        if (this.args.debug) {
            console.log(argv);
            console.log(this.args);
        }

        // Make sure the input file exists
        if (!fs.existsSync(this.args.input)) {
            this.kill('Input file does not exist');
        }

        // Make sure it's not a directory
        if (fs.statSync(this.args.input).isDirectory()) {
            this.kill('Input file was detected to be a directory');
        }

        // Prevent accidentally overwriting a file
        if (fs.existsSync(this.args.output) && this.args.continue === false) {
            this.kill(`Ouput file already exists. Use -c to overwrite`);
        }

        // Make sure the filter file exists
        this.args._filter = resolve(
            __dirname + `/filters/${this.args.filter}.json`
        );
        if (!fs.existsSync(this.args._filter)) {
            this.kill(`Unable to find the filter: ${this.args.filter}`);
        }

        if (this.args.debug) console.log('arguments validated');
    }

    /**
     * Clean the subtitle file, then write the output
     */
    clean() {
        // Load the blacklist
        if (this.args.debug) console.log('Filter: ' + this.args._filter);
        const blacklist = JSON.parse(
            fs.readFileSync(this.args._filter, 'utf-8')
        );

        // Parse the subtitle file
        const nodes = parseSync(fs.readFileSync(this.args.input, 'utf-8'));

        // Remove ads
        nodes.forEach((node: any, index) => {
            blacklist.forEach((mark: any) => {
                if (node.data.text.toLowerCase().includes(mark)) {
                    console.log(
                        `[Match] Advertising found in node ${index} (${mark})`
                    );
                    node.data.text = '';
                }
            });
        });

        // Remove input file
        if (this.args.clean) fs.unlinkSync(this.args.input);

        // Stringify cleaned subtitles
        const cleaned = stringifySync(nodes, {
            format: this.args.ext.replace(/./g, ''),
        });

        // Write the file
        fs.writeFileSync(this.args.output, cleaned);
        console.log(`[Done] Wrote to ${this.args.output}`);
    }
}

new Subclean().init();
