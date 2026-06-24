printf "usage: $0 <duration> <tps> <rampUpDuration> <rampDownDuration> <env>\n\n"
printf "<env> is optional. Values - stage, prod. Defaults to prod\n\n"


duration="$1"
tps="$2"
rampUpTps="$tps"
rampUpDuration="$3"
rampDownTps="$tps"
rampDownDuration="$4"
env="$5"

export RUN_REQUEST_PARAMS="duration=$duration;tps=$tps;rampUpTps=$rampUpTps;rampUpDuration=$rampUpDuration;rampDownTps=$rampDownTps;rampDownDuration=$rampDownDuration"

export CONFIG_FILE="prod-config"
export DATA_FILE="prod-data"
if [ "$env" == "stage" ]; then
  export CONFIG_FILE="preprod-config"
  export DATA_FILE="preprod-data" 
fi
./gradlew performanceTest
