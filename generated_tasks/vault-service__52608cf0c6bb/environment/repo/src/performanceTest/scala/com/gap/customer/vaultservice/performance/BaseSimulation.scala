package com.gap.customer.vaultservice.performance

import com.typesafe.config._
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import io.gatling.http.protocol.HttpProtocolBuilder
import io.gatling.http.request.builder.HttpRequestBuilder

class BaseSimulation extends Simulation {


  /**
   * To Run Performance tests locally please run below command
   * in your shell to set TARGET_URL & API_KEY environment variables
   * with the appropriate values
   * E.g:Configured for test environment
   * 1) export CONFIG_FILE="preprod-config"
   * 2) export DATA_FILE="preprod-data"
   * 3) export CC_DATA_FILE="preprod-data-cc"
   * 4) export PWD_DATA_FILE="preprod-data-pwd"
   * 5) export TYPES_DATA_FILE="preprod-data-type"
   * To Run the VaultEntries and Tokenentries Insertion script, turn on Insertion flag
   * 6) export IS_INSERTION_SCRIPT_ENABLED=true
   * 7) export IS_BLUEFIN_ENABLED=true
   * 8) export TARGET_URL=https://vault-service-stage.apps.cfcommerce.devpci.azeus.gaptech.com
   * Configuration for run parameters for rampUsersPerSec({start}) to ({end}) during({duration} minutes)
   * E.g:
   * 7) export RUN_REQUEST_PARAMS="duration=1;tps=10;rampUpTps=2;rampUpDuration=60;rampDownTps=2;rampDownDuration=60;vaultInsertionTps=1;tokenInsertionTps=1;vaultEntriesPCT=30;tokenEntriesPCT=30;vaultEntriesSearchPCT=15;tokenEntriesSearchPCT=14;matchPCT=10;tokenEntriesSearchBluefinPCT=1;tokenEntriesBulkTps=10;tokenEntriesBulkPCT=10;bulkMaxRequests=5"
   * Request params for bulk tokenize ONLY
   * duration=5;tps=10;rampUpTps=5;rampUpDuration=30;rampDownTps=5;rampDownDuration=30;tokenEntriesBulk=10;bulkMaxRequests=
   */

  val getConfigFile = System.getenv("CONFIG_FILE")
  val getDataFile = System.getenv("DATA_FILE")
  val getDataFileForCC = System.getenv("CC_DATA_FILE")
  val getDataFileForPwd = System.getenv("PWD_DATA_FILE")
  val getDataFileForMultipleTypes = System.getenv("TYPES_DATA_FILE")
  val runParamConfiguration = System.getenv("RUN_REQUEST_PARAMS")

  if (getDataFile == null || getConfigFile == null || runParamConfiguration == null ||
    getDataFileForCC == null || getDataFileForPwd == null || getDataFileForMultipleTypes == null) {
    throw new RuntimeException("Need to set all three of the following environment variables: " +
      "DATA_FILE, CONFIG_FILE, RUN_REQUEST_PARAMS,CC_DATA_FILE,PWD_DATA_FILE,TYPES_DATA_FILE")
  }

  val getDataFeeder = csv("data/" + getDataFile + ".csv").random
  val getDataFeederForCC = csv("data/" + getDataFileForCC + ".csv").random
  val getDataFeederForPwd = csv("data/" + getDataFileForPwd + ".csv").random
  val getDataFeederForMultipleTypes = csv("data/" + getDataFileForMultipleTypes + ".csv").random
  var percentageMap = Map[String, String]()
  var getRequestMap = Map[String, String]()
  var conf = ConfigFactory.load("data/" + getConfigFile + ".properties")
  val baseUrl = System.getenv("TARGET_URL")
  val clientId = conf.getString("clientId")
  val clientSecret = conf.getString("clientSecret")
  val apiKeyValue = conf.getString("apiKey")
  val insertionFlag = System.getenv("IS_INSERTION_SCRIPT_ENABLED")
  val bluefinFlag = System.getenv("IS_BLUEFIN_ENABLED")

  println(s"DATA_FILE:'$getDataFile': TARGET_URL:'$baseUrl': : insertionFlag:'$insertionFlag': : bluefinFlag:'$bluefinFlag': runParamConfiguration:'$runParamConfiguration':")

  runParamConfiguration.split(";").map(_.split("=")).foreach(
    a => getRequestMap += a(0) -> a(1)
  )

  val redirectUri = "https://github.gapinc.com/pages/vbarbos/linkbuilder/openid-connect/callback-handler.html"
  val encodedRedirectUri = "https%3A%2F%2Fgithub.gapinc.com%2Fpages%2Fvbarbos%2Flinkbuilder%2Fopenid-connect%2Fcallback-handler.html"


  private val initial_authorize_URL = s"/credentials/authorize?redirect_uri=$encodedRedirectUri&scope=openid profile &response_type=code&response_mode=form_post&client_id=$clientId"

  val initial_authorize_Customer: HttpRequestBuilder = http("initial_authorize")
    .get(initial_authorize_URL)
    .check(status.is(200))
    .check(regex(s"""method="(?:post|POST)" action="/commerce(.+?)"""").saveAs("customer_login_url"))

  val customer_login = feed(getDataFeeder).exec(http("customer login")
    .post("${customer_login_url}")
    .formParam("pf.username", "test_authentication1@gap.com")
    .formParam("pf.pass", "P@ssword$1")
    .formParam("pf.ok", "clicked")
    .formParam("pf.cancel", "")
    //TODO: is the pf.adapterId field needed?
    .check(status.is(200))
    .check(substring("Page Expired").notExists)
    .check(substring("We didn't recognize the username or password you entered.").notExists)
    .check(substring("ping-error").notExists)
    .check(substring("access_denied").notExists)
    .check(regex("""name="code" value="(.+)"""").saveAs("intermediate_code")))

  val token_exchange: HttpRequestBuilder = http("token exchange")
    .post("/credentials/token")
    .formParam("client_id", clientId)
    .formParam("client_secret", clientSecret)
    .formParam("grant_type", "authorization_code")
    .formParam("redirect_uri", redirectUri)
    .formParam("code", "${intermediate_code}")
    .check(status.saveAs("tokenExchangeStatus"))
    .check(status.is(200))
    .check(jsonPath("$.access_token").saveAs("access_token"))


  val httpClient = http.baseUrl(baseUrl)

  val headers_for_token = Map(
    "Content-Type" -> "application/json",
    // "Authorization" -> "Bearer ${access_token}",
    "Accept" -> "application/json",
    "X-App-Name" -> "Gatling-Load-Test",
    "X-Apigee-Scopes" -> "creditcard,giftCard,token"
  )


  val headers_for_apikey = Map(
    "Content-Type" -> "application/json",
    "apikey" -> apiKeyValue
  )


  val httpConf: HttpProtocolBuilder = http
    .baseUrl(baseUrl)
    .userAgentHeader("Gatling")
    .disableCaching

}