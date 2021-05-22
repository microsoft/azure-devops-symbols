"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const just_scripts_1 = require("just-scripts");
// for options that have a check/fix switch this puts them into fix mode
just_scripts_1.option("fix");
just_scripts_1.task('build', just_scripts_1.tscTask());
just_scripts_1.task('start', just_scripts_1.tscWatchTask());
just_scripts_1.task("lint", just_scripts_1.series(() => (just_scripts_1.argv().fix ? just_scripts_1.prettierTask : just_scripts_1.prettierCheckTask), just_scripts_1.eslintTask({ files: ["src/."] })));
just_scripts_1.task('test', just_scripts_1.jestTask());
//# sourceMappingURL=just.default.config.js.map