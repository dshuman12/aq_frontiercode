package com.gap.customer.vaultservice.services;

import java.util.ArrayList;
import java.util.List;
import com.gap.customer.vaultservice.controller.VaultServiceValidator;
import org.junit.Test;
import com.gap.customer.vaultservice.exception.VaultServiceException;
import com.gap.customer.vaultservice.models.VaultRequest;

public class VaultServiceValidatorTest {

	VaultServiceValidator validator = new VaultServiceValidator();


	@Test(expected = VaultServiceException.class)
	public void testEmptyRequestError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testNullRequestError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInputDataMissingPaintTextError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4111111111111111", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "", 1));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInputDataMissingIndexError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4111111111111111", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", null));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInputDataMissingTypeError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4111111111111111", 0));
		vaultRequests.add(new VaultRequest("", "5555555555554440", 1));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInputDataMissingCardNumbersError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "", 1));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInvalidValueTypeError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4111111111111111", 0));
		vaultRequests.add(new VaultRequest("CARD_NUMBER", "5555555555554440", 1));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInvalidCreditCardError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "abcdefghijklmnop", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInvalidCardLengthMinError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "411111111111", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInvalidCardLengthMaxError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER",
				"abcdefghijklmnopqrstuvwxyzaaabbbcccdddeeefffggghhhiiijjjkkklllmmmnnnoooppp", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testNotUniqueIndexesError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4111111111111111", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 0));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInvalidInputDataError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("", "", null));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 0));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test
	public void testWithNoErrors() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "4111111111111111", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_NUMBER", "5555555555554440", 1));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInvalidGiftCardError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("GIFT_CARD_NUMBER", "abcdefghijklmnopd", 0));
		vaultRequests.add(new VaultRequest("GIFT_CARD_NUMBER", "5555555555554440", 1));

		validator.validateVaultSecuredServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInvalidGiftCardMinLengthError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("GIFT_CARD_NUMBER", "55555555", 1));

		validator.validateVaultSecuredServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInvalidGiftCardMaxLengthError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("GIFT_CARD_NUMBER", "4111111111111111111111111", 0));

		validator.validateVaultSecuredServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInvalidGiftPinError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("GIFT_CARD_PIN", "@@SS", 0));
		vaultRequests.add(new VaultRequest("GIFT_CARD_PIN", "!!DD", 1));

		validator.validateVaultSecuredServiceRequest(vaultRequests);
	}


	@Test(expected = VaultServiceException.class)
	public void testInvalidCreditCardMonth() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_MONTH", "9", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_MONTH", "1", 1));

		validator.validateVaultSecuredServiceRequest(vaultRequests);
	}


	@Test(expected = VaultServiceException.class)
	public void testInvalidCreditCardYear() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<>();
		vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_YEAR", "20019", 0));
		vaultRequests.add(new VaultRequest("CREDIT_CARD_EXPIRY_YEAR", "1", 1));

		validator.validateVaultSecuredServiceRequest(vaultRequests);
	}


	@Test(expected = VaultServiceException.class)
	public void testInvalidGiftCardTrackTwoMinLengthError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("GIFT_CARD_TRACK2", "di32sd;asdf3", 1));

		validator.validateVaultServiceRequest(vaultRequests);
	}

	@Test(expected = VaultServiceException.class)
	public void testInvalidGiftCardTrackTwoMaxLengthError() throws VaultServiceException {
		List<VaultRequest> vaultRequests = new ArrayList<VaultRequest>();
		vaultRequests.add(new VaultRequest("GIFT_CARD_TRACK2", "392duiowqdsf83jkad8932jdaskjhfuh3?uoaudisof;372932898ejkajsd378s32", 0));

		validator.validateVaultServiceRequest(vaultRequests);
	}

}
