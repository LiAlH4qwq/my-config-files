set pcD "/media/hdd/lialh4"
set laptopD "/mnt/data/lialh4"
if [ -d $pcD ]
    set -gx LOCAL_DRIVE_D $pcD
else
    set -gx LOCAL_DRIVE_D $laptopD
end
