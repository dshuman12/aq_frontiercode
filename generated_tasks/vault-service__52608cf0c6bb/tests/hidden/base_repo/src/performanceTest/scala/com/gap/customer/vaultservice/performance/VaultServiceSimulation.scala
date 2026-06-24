package com.gap.customer.vaultservice.performance


import io.gatling.core.Predef._
import io.gatling.http.Predef._

import scala.concurrent.duration._

class VaultServiceSimulation extends BaseSimulation {

  val bulkMaxCalls=getRequestMap("bulkMaxRequests").toInt

  val get_customer_token = exec(initial_authorize_Customer)
    .exitHereIfFailed
    .exec(customer_login)
    .exitHereIfFailed
    .exec(token_exchange)
    .exitHereIfFailed

  val VaultEntries = feed(getDataFeeder).exec(http("Post for /vault-entries")
    .post("/vault-entries")
    .headers(headers_for_token)
    .body(
      StringBody(
        """[{"type": "${type}",
          |"index": "${index}",
          |"plaintext": "${plaintext}"
            }]""".stripMargin)).asJson)

  //  val VaultId = feed(getDataFeeder).exec(http("Post for /Vault Ids")
  //    .post("/vault-ids")
  //    .headers(headers_for_apikey)
  //    .body(
  //      StringBody(
  //        """[{"type": "${type}",
  //          |"plaintext": "${plaintext}",
  //          |"index": "${index}"
  //        }]""".stripMargin)).asJson)


  //  val token = feed(getDataFeeder).exec(http("Post for /token")
  //    .post("/tokens")
  //    .headers(headers_for_apikey)
  //    .body(
  //      StringBody(
  //        """[{"type": "${type3}",
  //          |"data": "${data}",
  //          |"index": "${index3}"
  //            }]""".stripMargin)).asJson)

  val TokenEntries = feed(getDataFeederForCC).exec(http("Post for /token-entries")
    .post("/token-entries")
    .headers(headers_for_token)
    .body(
      StringBody(
        """[{"type": "${type}",
          |"index": "${index}",
          |"plaintext": "${plaintext}"
              }]""".stripMargin)).asJson)


  val VaultEntriesSearch = feed(getDataFeeder).exec(http("Post for /vault-entries/search")
    .post("/vault-entries/search")
    .headers(headers_for_token)
    .body(
      StringBody(
        """[{"returnType": "${returnType}",
          |"index": "${index}",
          |"vaultId": "${vaultId}"}]""".stripMargin)).asJson)

  val TokenEntriesSearch = feed(getDataFeederForCC).exec(http("Post for /token-entries/search")
    .post("/token-entries/search")
    .headers(headers_for_token)
    .body(
      StringBody(
        """[{"returnType": "VAULT_ID",
          |"index": "${index}",
          |"token": "${voltageToken}"}]""".stripMargin)).asJson)

  val TokenEntriesSearchBluefin = feed(getDataFeederForCC).exec(http("Post for /token-entries/search for Bluefin token")
    .post("/token-entries/search")
    .headers(headers_for_token)
    .body(
      StringBody(
        """[{"returnType": "VAULT_ID",
          |"index": "${index}",
          |"token": "${bluefinToken}",
          |"tokenId": "${bluefinId}"}]""".stripMargin)).asJson)

  val Match = feed(getDataFeederForPwd).exec(http("Post for /match")
    .post("/match")
    .headers(headers_for_token)
    .body(
      StringBody(
        """{"type": "${type}",
          |"plaintext": "${plaintext}",
          |"vaultId": "${vaultId}"}""".stripMargin)).asJson)


  var length = 16
  var randomPlaintext = ""
  var dataType = ""
  val VaultEntriesInsertion = feed(getDataFeederForMultipleTypes)
    .exec(session => {
      length = session("length").as[Int]
      randomPlaintext = getGivenDigitString(length)
      dataType = session("dataType").as[String]
      session
    })
    .exec(http("Post for /vault-entries insertion")
      .post("/vault-entries")
      .headers(headers_for_token)
      .body(
        StringBody(session =>
          s"""[{"type": "$dataType",
             "index": 0,
             "plaintext": "$randomPlaintext"
              }]""".stripMargin)).asJson)


  var randomCC = ""
  val TokenEntriesInsertion = exec(session => {
    randomCC = getGivenDigitString(16)
    session
  }).exec(http("Post for /token-entries insertion")
    .post("/token-entries")
    .headers(headers_for_token)
    .body(
      StringBody(session =>
        s"""[{"type": "CREDIT_CARD_NUMBER",
             "index": 0,
             "plaintext": "$randomCC"
              }]""".stripMargin)).asJson)

  val TokenEntriesWithBulk = feed(getDataFeederForCC).exec(http("Post for /token-entries for Bulk CreditCardNumbers")
    .post("/token-entries")
    .headers(headers_for_token)
    .body(
      StringBody(
        getTokenEntriesPayloadWithBulk().stripMargin)).asJson)

  val TokenEntriesWithBulkInsertion = feed(getDataFeederForCC).exec(http("Post for /token-entries for Bulk Insertion CreditCardNumbers")
    .post("/token-entries")
    .headers(headers_for_token)
    .body(
      StringBody(
        getTokenEntriesPayloadWithBulkInsertion().stripMargin)).asJson)
  //  private val post_vault_id = scenario("Post Vault ID")
  //    .exec(VaultId)
  //    .exitHereIfFailed

  //  private val post_token = scenario("Post Token")
  //    .exec(token)
  //    .exitHereIfFailed

  private val post_vault_entries = scenario("Vault Entries ")
    .exec(VaultEntries)
    .exitHereIfFailed

  private val post_token_entries = scenario("Token Entries ")
    .exec(TokenEntries)
    .exitHereIfFailed

  private val post_vault_entries_search = scenario("Vault Entries Search")
    .exec(VaultEntriesSearch)
    .exitHereIfFailed

  private val post_token_entries_search = scenario("Token Entries Search")
    .exec(TokenEntriesSearch)
    .exitHereIfFailed

  private val post_match = scenario("Match")
    .exec(Match)
    .exitHereIfFailed

  private val vault_entries_insertion = scenario("Vault Entries Insertion")
    .doIf(insertionFlag) {
      exec(VaultEntriesInsertion).exitHereIfFailed
    }.exitHereIfFailed

  private val token_entries_insertion = scenario("Token Entries Insertion")
    .doIf(insertionFlag) {
      exec(TokenEntriesInsertion).exitHereIfFailed
    }.exitHereIfFailed

  private val token_entries_search_bluefin = scenario("Token Entries Search bluefin")
    .doIf(bluefinFlag) {
      exec(TokenEntriesSearchBluefin).exitHereIfFailed
    }.exitHereIfFailed

  private val post_token_entries_bulk = scenario("Token Entries for Bulk Credit card numbers")
    .doIf(bulkMaxCalls<=1000 && bulkMaxCalls>0) {
      exec(TokenEntriesWithBulk).exitHereIfFailed
    }.exitHereIfFailed

  private val post_token_entries_bulk_insertion = scenario("Token Entries for Bulk Insertion of Credit card numbers")
    .doIf(insertionFlag){
      doIf(bulkMaxCalls<=1000 && bulkMaxCalls > 0)
      {
        exec(TokenEntriesWithBulkInsertion).exitHereIfFailed
      }.exitHereIfFailed
    }.exitHereIfFailed

  setUp(

    //    post_token.inject(
    //                rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
    //                constantUsersPerSec(getRequestMap("tps").toDouble) during(getRequestMap("duration").toDouble minutes),
    //                rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds)),
    //
    //    post_vault_id.inject(
    //      rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
    //      constantUsersPerSec(getRequestMap("tps").toDouble) during (getRequestMap("duration").toDouble minutes),
    //      rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds)),

    post_vault_entries.inject(
      rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
      constantUsersPerSec(getTps(getRequestMap("vaultEntriesPCT").toDouble)) during (getRequestMap("duration").toDouble minutes),
      rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds)),

    post_token_entries.inject(
      rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
      constantUsersPerSec(getTps(getRequestMap("tokenEntriesPCT").toDouble)) during (getRequestMap("duration").toDouble minutes),
      rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds)),

    post_vault_entries_search.inject(
      rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
      constantUsersPerSec(getTps(getRequestMap("vaultEntriesSearchPCT").toDouble)) during (getRequestMap("duration").toDouble minutes),
      rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds)),

    post_token_entries_search.inject(
      rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
      constantUsersPerSec(getTps(getRequestMap("tokenEntriesSearchPCT").toDouble)) during (getRequestMap("duration").toDouble minutes),
      rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds)),

    post_match.inject(
      rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
     constantUsersPerSec(getTps(getRequestMap("matchPCT").toDouble)) during (getRequestMap("duration").toDouble minutes),
      rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds)),

    vault_entries_insertion.inject(
      rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
      constantUsersPerSec(getRequestMap("vaultInsertionTps").toDouble) during (getRequestMap("duration").toDouble minutes),
      rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds)),

    token_entries_insertion.inject(
      rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
      constantUsersPerSec(getRequestMap("tokenInsertionTps").toDouble) during (getRequestMap("duration").toDouble minutes),
      rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds)),

    token_entries_search_bluefin.inject(
      rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
      constantUsersPerSec(getTps(getRequestMap("tokenEntriesSearchBluefinPCT").toDouble)) during (getRequestMap("duration").toDouble minutes),
      rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds)),

    post_token_entries_bulk.inject(
      rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
      constantUsersPerSec(getRequestMap("tokenEntriesBulkPCT").toDouble) during (getRequestMap("duration").toDouble minutes),
      rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds)),

    post_token_entries_bulk_insertion.inject(
      rampUsersPerSec(1) to getRequestMap("rampUpTps").toInt during (getRequestMap("rampUpDuration").toDouble seconds),
      constantUsersPerSec(getRequestMap("tokenEntriesBulkTps").toDouble) during (getRequestMap("duration").toDouble minutes),
      rampUsersPerSec(getRequestMap("rampDownTps").toInt) to (1) during (getRequestMap("rampDownDuration").toDouble seconds))
  )
    .protocols(httpConf)

  def getGivenDigitString(i: Int): String = {
    var result: Long = (Math.floor(Math.random() * (9 * Math.pow(10, i - 1))) + Math.pow(10, (i - 1))).toLong
    return result + ""
  }

  def getTokenEntriesPayloadWithBulk() : String = {
    var creditCardNumber = "${plaintext}";
    var bulkMaxCalls = getRequestMap("bulkMaxRequests").toInt;
    var payLoad = "["
    for (i <- 0 to bulkMaxCalls-2) {
       payLoad = payLoad + "{\"type\": \"CREDIT_CARD_NUMBER\",\"index\": \""+i+"\",\"plaintext\": \""+creditCardNumber+"\"},"
    }
    payLoad = payLoad + "{\"type\": \"CREDIT_CARD_NUMBER\",\"index\": \"999\",\"plaintext\": \""+creditCardNumber+"\"}]"
    //println(payLoad)
    return payLoad
  }

  def getTokenEntriesPayloadWithBulkInsertion() : String = {
    var creditCardNumber = getGivenDigitString(16);
    var bulkMaxCalls = getRequestMap("bulkMaxRequests").toInt;
    var payLoad = "["
    for (i <- 0 to bulkMaxCalls-2) {
      payLoad = payLoad + "{\"type\": \"CREDIT_CARD_NUMBER\",\"index\": \""+i+"\",\"plaintext\": \""+creditCardNumber+"\"},"
    }
    payLoad = payLoad + "{\"type\": \"CREDIT_CARD_NUMBER\",\"index\": \"999\",\"plaintext\": \""+creditCardNumber+"\"}]"
    //println(payLoad)
    return payLoad
  }

  def getTps(percentage: Double): Double = {
    return ((getRequestMap("tps").toDouble) * percentage) / 100
  }
}