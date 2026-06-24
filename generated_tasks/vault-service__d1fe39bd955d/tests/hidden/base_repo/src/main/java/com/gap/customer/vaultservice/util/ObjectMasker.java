package com.gap.customer.vaultservice.util;

import java.util.ArrayList;
import java.util.List;

import org.apache.commons.lang.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Field;

public class ObjectMasker {
	private static Logger logger = LoggerFactory.getLogger(ObjectMasker.class);
	private static final String PLAIN_TEXT = "plaintext";
	private static final int PLAIN_TEXT_LAST_DIGITS = 4;

	public static String getMaskedString(Object object, List<String> fieldsToMask) {

		StringBuffer posted = new StringBuffer();
		try {
			if (object != null) {
				List listValue = (List) object;
				for (Object obj : listValue) {

					Field[] fields = obj.getClass().getDeclaredFields();
					posted.append("[ ");

					for (Field field : fields) {

						posted.append(field.getName() + "=  ");

						// makes this private field instance accessible
						// for reflection use only, not normal code

						field.setAccessible(true);
						if (field.get(obj) != null) {
							if (fieldsToMask.contains(field.getName())) {
								posted.append("*****   ");
							} else {
								// get the value of this private field
								if (field.getName().equalsIgnoreCase(PLAIN_TEXT)) {
									String maskedPlainText = StringUtils.right(field.get(obj).toString(),
											PLAIN_TEXT_LAST_DIGITS);
									posted.append("*********" + maskedPlainText + "  ");
								} else {
									posted.append(field.get(obj) + "  ");
								}

								Class<?> nestedFieldType = field.getType();

								if (nestedFieldType != null && nestedFieldType.getPackage() != null
										&& nestedFieldType.getPackage().getName().contains("com.gap")) {
									Field[] nestedFields = nestedFieldType.getDeclaredFields();
									posted.append("[ ");
									for (Field nestedField : nestedFields) {
										posted.append(nestedField.getName() + "=  ");
										nestedField.setAccessible(true);

										if (nestedField.get(field.get(obj)) != null) {
											if (fieldsToMask.contains(nestedField.getName())) {
												posted.append("*****   ");
											} else {
												posted.append(nestedField.get(field.get(obj)) + "  ");
											}
										}

									}
									posted.append("] ");
								}

							}
						}
					}
					posted.append("]");

				}
			}
		} catch (IllegalArgumentException e) {
			logger.error("getMaskedString::Exception:", e);
		} catch (IllegalAccessException ex) {
			logger.error("getMaskedString::Exception:", ex);
		}

		return posted.toString();
	}

}
