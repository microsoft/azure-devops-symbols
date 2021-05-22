import { 
    argv,
    eslintTask,
    jestTask, 
    option, 
    prettierCheckTask, 
    prettierTask, 
    series,
    task, 
    tscTask, 
    tscWatchTask 
} from 'just-scripts';

// for options that have a check/fix switch this puts them into fix mode
option("fix");

task('build', tscTask());

task('start', tscWatchTask());

task("lint", series(
    () => (argv().fix ? prettierTask : prettierCheckTask),
    eslintTask({ files: ["src/."] })
));

task('test', jestTask());