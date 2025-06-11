#!/bin/env fish

set UNITS "singbox-gui"
set SINGBOX_GUI_PROFILE ~/.opt/gui-for-singbox/data/profiles.yaml

function configctl
    cd (status dirname)
    switch (count $argv)
        case "2"
            if not contains $argv[2] "backup" "restore" 
                help
                exit 1
            end
            process $argv
        case "*"
            help
    end
end

function help
    echo "usage: configctl <unit> <backup|restore>"
end

function process
    switch $argv[1]
        case "singbox-gui"
            set file $SINGBOX_GUI_PROFILE
        case "*"
            echo "unsupported unit, available units are:"
            echo $UNITS
            exit 1
    end
    set file_splited (string split -rm 1 "/" $file)
    set file_name $file_splited[2]
    switch $argv[2]
        case "backup"
            mkdir $argv[1] 2> /dev/null
            cp $file $argv[1]
        case "restore"
            cp $argv[1]"/"$file_name $file
    end
end        

configctl $argv
