import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { db } from '../src/db';
import { categories, items } from '../src/db/schema';

// MongoDB exported data
const mongoProducts = [
  {
  "_id": {
    "$oid": "683bfd9146cf7a6aa1bcf518"
  },
  "product_name": "crusier   18 inch (foam)  |  کرسیئر 18 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4968,
  "retail_price": 9000,
  "wholesale_price": 6850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:13:21.325Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:16:34.866Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683bfdbd46cf7a6aa1bcf51c"
  },
  "product_name": "crusier   18 inch  |  کرسیئر 18 انچ",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4917,
  "retail_price": 8800,
  "wholesale_price": 6700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:14:05.793Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683bfe1246cf7a6aa1bcf520"
  },
  "product_name": "shaheen   18 inch  |  شاہین 18 انچ",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4982,
  "retail_price": 9000,
  "wholesale_price": 6700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:15:30.769Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683bfe4d46cf7a6aa1bcf524"
  },
  "product_name": "shaheen   18 inch (foam)  |  شاہین 18 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4970,
  "retail_price": 9000,
  "wholesale_price": 6850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:16:29.433Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T14:00:12.929Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683bfe9346cf7a6aa1bcf528"
  },
  "product_name": "crusier   14 inch (foam)  |  کرسیئر 14 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 9000,
  "wholesale_price": 6550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:17:39.477Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:35:44.518Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683bfeba46cf7a6aa1bcf52c"
  },
  "product_name": "cruiser   14 inch  |  کروزر 14 انچ",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 8000,
  "wholesale_price": 6350,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:18:18.095Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:35:28.720Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683bff1c46cf7a6aa1bcf530"
  },
  "product_name": "M2020   16 inch (foam)  |  ایم2020 16 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4940,
  "retail_price": 10500,
  "wholesale_price": 8200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:19:56.001Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683bff5e46cf7a6aa1bcf534"
  },
  "product_name": "M240   12 inch (foam)  |  ایم240 12 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4756,
  "retail_price": 7800,
  "wholesale_price": 6150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:21:02.128Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683bffbc46cf7a6aa1bcf538"
  },
  "product_name": "road king   13 inch (double-brake foam)  |  روڈ کنگ 13 انچ (ڈبل بریک فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4985,
  "retail_price": 7500,
  "wholesale_price": 5750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:22:36.849Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683bffdc46cf7a6aa1bcf53c"
  },
  "product_name": "road king   13 inch (double-brake)  |  روڈ کنگ 13 انچ (ڈبل بریک)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4967,
  "retail_price": 7200,
  "wholesale_price": 5650,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:23:08.081Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:16:34.866Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c001e46cf7a6aa1bcf540"
  },
  "product_name": "p24   12 inch (foam)  |  پی24 12 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4965,
  "retail_price": 6000,
  "wholesale_price": 4600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:24:14.847Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:39:04.549Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c006746cf7a6aa1bcf544"
  },
  "product_name": "power mega   12 inch (foam)  |  پاور میگا 12 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4997,
  "retail_price": 6000,
  "wholesale_price": 4550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:25:27.244Z"
  },
  "updatedAt": {
    "$date": "2025-10-09T10:32:01.796Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c00ab46cf7a6aa1bcf548"
  },
  "product_name": "jaguar   16 inch (foam)  |  جیگوار 16 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4972,
  "retail_price": 8500,
  "wholesale_price": 6600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:26:35.134Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c00c846cf7a6aa1bcf54c"
  },
  "product_name": "jaguar   16 inch  |  جیگوار 16 انچ",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4866,
  "retail_price": 8200,
  "wholesale_price": 6400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:27:04.227Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c00ec46cf7a6aa1bcf550"
  },
  "product_name": "jaguar   12 inch (foam)  |  جیگوار 12 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 6500,
  "wholesale_price": 4700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:27:40.877Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:33:48.787Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c011946cf7a6aa1bcf554"
  },
  "product_name": "jaguar   12 inch  |  جیگوار 12 انچ",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4985,
  "retail_price": 6000,
  "wholesale_price": 4600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:28:25.848Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:22:43.596Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c015246cf7a6aa1bcf558"
  },
  "product_name": "ben 10 mp   12 inch (foam)  |  بین 10 ایم پی 12 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 6000,
  "wholesale_price": 4600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:29:22.721Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:33:28.590Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c018b46cf7a6aa1bcf55c"
  },
  "product_name": "ben 10 hero   10 inch (foam)  |  بین 10 ہیرو 10 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4994,
  "retail_price": 4800,
  "wholesale_price": 3650,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:30:19.495Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:01:25.598Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c01ee46cf7a6aa1bcf563"
  },
  "product_name": "ben 10 hero   10 inch (chain)  |  بین 10 ہیرو 10 انچ (چین)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 5500,
  "wholesale_price": 4150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:31:58.359Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:33:11.686Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c021e46cf7a6aa1bcf567"
  },
  "product_name": "barbie   16 inch (foam)  |  باربی 16 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4999,
  "retail_price": 10500,
  "wholesale_price": 7300,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:32:46.106Z"
  },
  "updatedAt": {
    "$date": "2025-11-02T11:01:08.153Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c029146cf7a6aa1bcf5d2"
  },
  "product_name": "barbie   12 inch (foam)  |  باربی 12 انچ (فوم)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 9000,
  "wholesale_price": 6500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T07:34:41.497Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:32:54.658Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c46bec917d4373607bb96"
  },
  "product_name": "force   18 inch (foam)  |  فورس 18 انچ (فوم)",
  "product_category": "Flying Eagle (Cycle 2 Wheelers Kids)",
  "product_quantity": 4969,
  "retail_price": 9000,
  "wholesale_price": 6800,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T12:25:34.850Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c46edc917d4373607bb9a"
  },
  "product_name": "force   18 inch  |  فورس 18 انچ",
  "product_category": "Flying Eagle (Cycle 2 Wheelers Kids)",
  "product_quantity": 4978,
  "retail_price": 8500,
  "wholesale_price": 6600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T12:26:21.257Z"
  },
  "updatedAt": {
    "$date": "2026-01-20T13:56:18.762Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c472ec917d4373607bb9e"
  },
  "product_name": "general   16 inch (foam)  |  جنرل 16 انچ (فوم)",
  "product_category": "Flying Eagle (Cycle 2 Wheelers Kids)",
  "product_quantity": 4993,
  "retail_price": 8500,
  "wholesale_price": 6550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T12:27:26.861Z"
  },
  "updatedAt": {
    "$date": "2026-01-03T13:53:02.942Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c4751c917d4373607bba2"
  },
  "product_name": "general   16 inch  |  جنرل 16 انچ",
  "product_category": "Flying Eagle (Cycle 2 Wheelers Kids)",
  "product_quantity": 4994,
  "retail_price": 8200,
  "wholesale_price": 6350,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T12:28:01.972Z"
  },
  "updatedAt": {
    "$date": "2025-11-22T13:04:16.287Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c478ec917d4373607bba6"
  },
  "product_name": "foxcy   15 inch (foam)  |  فوکسی 15 انچ (فوم)",
  "product_category": "Flying Eagle (Cycle 2 Wheelers Kids)",
  "product_quantity": 4975,
  "retail_price": 8000,
  "wholesale_price": 6400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T12:29:02.330Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c47b1c917d4373607bbaa"
  },
  "product_name": "foxcy   15 inch  |  فوکسی 15 انچ",
  "product_category": "Flying Eagle (Cycle 2 Wheelers Kids)",
  "product_quantity": 4936,
  "retail_price": 8000,
  "wholesale_price": 6250,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T12:29:37.050Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:39:04.549Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c483fc917d4373607bbc4"
  },
  "product_name": "hunter   12 inch (foam)  |  ہنٹر 12 انچ (فوم)",
  "product_category": "Flying Eagle (Cycle 2 Wheelers Kids)",
  "product_quantity": 4996,
  "retail_price": 8000,
  "wholesale_price": 6250,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T12:31:59.246Z"
  },
  "updatedAt": {
    "$date": "2025-11-25T07:33:38.847Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c486fc917d4373607bbc8"
  },
  "product_name": "simsim   12 inch (foam)  |  سم سم 12 انچ (فوم)",
  "product_category": "Flying Eagle (Cycle 2 Wheelers Kids)",
  "product_quantity": 4922,
  "retail_price": 6800,
  "wholesale_price": 5600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T12:32:47.080Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c48d7c917d4373607bbcc"
  },
  "product_name": "simsim   12 inch (double chimta)  |  سم سم 12 انچ (ڈبل چمٹا)",
  "product_category": "Flying Eagle (Cycle 2 Wheelers Kids)",
  "product_quantity": 4994,
  "retail_price": 8000,
  "wholesale_price": 5700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T12:34:31.485Z"
  },
  "updatedAt": {
    "$date": "2026-01-31T13:37:58.011Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c4e42d5fa3e5ac18df75b"
  },
  "product_name": "ben 10   12 inch (double chimta brake)  |  بین 10 12 انچ (ڈبل چمٹا بریک)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4960,
  "retail_price": 6800,
  "wholesale_price": 5600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T12:57:38.038Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c4e88d5fa3e5ac18df81f"
  },
  "product_name": "ben 10   12 inch (double chimta)  |  بین 10 12 انچ (ڈبل چمٹا)",
  "product_category": "PHILCO (Cycle 2 Wheeler Kids)",
  "product_quantity": 4997,
  "retail_price": 6000,
  "wholesale_price": 4700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T12:58:48.308Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T08:23:02.159Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c4f05d5fa3e5ac18df827"
  },
  "product_name": "ben 10 hero 12 inch  |  بین 10 12 انچ",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4732,
  "retail_price": 4500,
  "wholesale_price": 3600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T13:00:53.937Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:46:00.066Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c4f41d5fa3e5ac18df82b"
  },
  "product_name": "ben 10   12 inch (foam)  |  بین 10 12 انچ (فوم)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4990,
  "retail_price": 4800,
  "wholesale_price": 3750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T13:01:53.102Z"
  },
  "updatedAt": {
    "$date": "2026-01-18T14:10:49.565Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9ad1d5fa3e5ac18e301a"
  },
  "product_name": "ben 10   12 inch (double chimtaa)  |  بین 10 12 انچ (ڈبل چمٹا)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4958,
  "retail_price": 6000,
  "wholesale_price": 4300,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:24:17.437Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:22:43.596Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9b08d5fa3e5ac18e301e"
  },
  "product_name": "ben 10   12 inch (brake)  |  بین 10 12 انچ (بریک)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4997,
  "retail_price": 6800,
  "wholesale_price": 5200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:25:12.514Z"
  },
  "updatedAt": {
    "$date": "2025-09-30T13:53:15.903Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9b62d5fa3e5ac18e3026"
  },
  "product_name": "titan double  |  ٹائٹن ڈبل",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4915,
  "retail_price": 6500,
  "wholesale_price": 4700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:26:42.729Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9b84d5fa3e5ac18e302a"
  },
  "product_name": "jet pro double (p) |  جیٹ پرو ڈبل",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4776,
  "retail_price": 5500,
  "wholesale_price": 3600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:27:16.252Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9caad5fa3e5ac18e302e"
  },
  "product_name": "deluxe double  |  ڈیلکس ڈبل",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 5000,
  "retail_price": 5000,
  "wholesale_price": 3550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:32:10.203Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:57:20.629Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9cd4d5fa3e5ac18e3032"
  },
  "product_name": "ranger single (music)  |  رینجر سنگل (میوزک)",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4711,
  "retail_price": 5500,
  "wholesale_price": 3700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:32:52.811Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:46:00.066Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9cf2d5fa3e5ac18e3036"
  },
  "product_name": "ranger single  |  رینجر سنگل",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4998,
  "retail_price": 5000,
  "wholesale_price": 3450,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:33:22.608Z"
  },
  "updatedAt": {
    "$date": "2025-11-01T13:25:42.067Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9d16d5fa3e5ac18e303a"
  },
  "product_name": "sonic  |  سونک",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4568,
  "retail_price": 4200,
  "wholesale_price": 2950,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:33:58.040Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9d41d5fa3e5ac18e303e"
  },
  "product_name": "spiderman  |  اسپائیڈر مین",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4577,
  "retail_price": 4000,
  "wholesale_price": 2850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:34:41.101Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:46:00.066Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9d5ad5fa3e5ac18e3042"
  },
  "product_name": "rider golden |  رائڈر",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4930,
  "retail_price": 6000,
  "wholesale_price": 3550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:35:06.739Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:46:00.066Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9dcbd5fa3e5ac18e3046"
  },
  "product_name": "flash pro  |  فلیش پرو",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4920,
  "retail_price": 3800,
  "wholesale_price": 2800,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:36:59.676Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T13:40:20.426Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9de5d5fa3e5ac18e304a"
  },
  "product_name": "jet single  |  جیٹ سنگل",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4993,
  "retail_price": 4200,
  "wholesale_price": 3050,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:37:25.249Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T07:44:05.729Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9e04d5fa3e5ac18e304e"
  },
  "product_name": "minion  |  منیئن",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4973,
  "retail_price": 6500,
  "wholesale_price": 4100,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:37:56.657Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:41:49.839Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9e1fd5fa3e5ac18e3052"
  },
  "product_name": "flash  |  فلیش",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4994,
  "retail_price": 3800,
  "wholesale_price": 2750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:38:23.565Z"
  },
  "updatedAt": {
    "$date": "2026-01-08T11:46:09.191Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9e50d5fa3e5ac18e3056"
  },
  "product_name": "GT single  |  جی ٹی سنگل",
  "product_category": "Golden (3 wheeler kids)",
  "product_quantity": 4960,
  "retail_price": 6500,
  "wholesale_price": 3950,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:39:12.867Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683c9e92d5fa3e5ac18e305a"
  },
  "product_name": "titan stroller 3 wheeler  |  ٹائٹن اسٹرولر 3 ویلر",
  "product_category": "Car (Stroller) mix",
  "product_quantity": 4999,
  "retail_price": 6500,
  "wholesale_price": 4100,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-01T18:40:18.395Z"
  },
  "updatedAt": {
    "$date": "2025-10-07T14:36:15.495Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ead97d5fa3e5ac18e4514"
  },
  "product_name": "sony   16 inch 3 bar (double chimta)  |  سونی 16 انچ 3 بار (ڈبل چمٹا)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 4980,
  "retail_price": 15500,
  "wholesale_price": 12500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:08:55.125Z"
  },
  "updatedAt": {
    "$date": "2026-01-29T14:09:50.236Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eadf4d5fa3e5ac18e451e"
  },
  "product_name": "racer   16 inch (double chimta)  |  ریسر 16 انچ (ڈبل چمٹا)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 4989,
  "retail_price": 16000,
  "wholesale_price": 12500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:10:28.507Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:40:05.020Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eae2ed5fa3e5ac18e4522"
  },
  "product_name": "sony   20 inch 3 bar (double chimta)  |  سونی 20 انچ 3 بار (ڈبل چمٹا)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 4998,
  "retail_price": 17500,
  "wholesale_price": 14200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:11:26.150Z"
  },
  "updatedAt": {
    "$date": "2025-11-16T13:24:03.560Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eae62d5fa3e5ac18e4526"
  },
  "product_name": "apollo   20 inch (double chimta)  |  اپولو 20 انچ (ڈبل چمٹا)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 16500,
  "wholesale_price": 13800,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:12:18.217Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:36:47.563Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eae97d5fa3e5ac18e452a"
  },
  "product_name": "galaxy   20 inch (double chimta)  |  گلیکسی 20 انچ (ڈبل چمٹا)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 18000,
  "wholesale_price": 14600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:13:11.124Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:39:35.733Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eaee5d5fa3e5ac18e452e"
  },
  "product_name": "sony 555   20 inch (mota tyre dex brake)  |  سونی 555 20 انچ (موٹا ٹائر ڈسک بریک)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 23500,
  "wholesale_price": 18500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:14:29.655Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:39:22.300Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eaf13d5fa3e5ac18e4532"
  },
  "product_name": "sony 555   20 inch (gear)(mota tyre dex brake)  |  سونی 555 20 انچ (گیئر) (موٹا ٹائر ڈسک بریک)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 4991,
  "retail_price": 28500,
  "wholesale_price": 20500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:15:15.731Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:15:11.259Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eaf69d5fa3e5ac18e4536"
  },
  "product_name": "turbo   20 inch (mota tyre dex brake)  |  ٹربو 20 انچ (موٹا ٹائر ڈسک بریک)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 4989,
  "retail_price": 22000,
  "wholesale_price": 15600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:16:41.515Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:33:03.397Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eafebd5fa3e5ac18e4540"
  },
  "product_name": "sony   24 inch 3 bar (double chimta)  |  سونی 24 انچ 3 بار (ڈبل چمٹا)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 4998,
  "retail_price": 20500,
  "wholesale_price": 16200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:18:51.492Z"
  },
  "updatedAt": {
    "$date": "2026-01-14T13:59:14.286Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb023d5fa3e5ac18e4544"
  },
  "product_name": "racer   24 inch (double chimta)  |  ریسر 24 انچ (ڈبل چمٹا)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 4989,
  "retail_price": 21000,
  "wholesale_price": 16200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:19:47.320Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb04cd5fa3e5ac18e4548"
  },
  "product_name": "racer   26 inch (double chimta)  |  ریسر 26 انچ (ڈبل چمٹا)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 22000,
  "wholesale_price": 16600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:20:28.788Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:38:13.425Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb0ded5fa3e5ac18e454c"
  },
  "product_name": "sony   12 inch boy bar (foam)  |  سونی 12 انچ بوائے بار (فوم)",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 11000,
  "wholesale_price": 8100,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:22:54.180Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:37:58.949Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb111d5fa3e5ac18e4550"
  },
  "product_name": "sony   12 inch stone bike  |  سونی 12 انچ اسٹون بائیک",
  "product_category": "Sony (Cycle 2 Wheeler Kids)",
  "product_quantity": 4997,
  "retail_price": 14500,
  "wholesale_price": 11500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:23:45.843Z"
  },
  "updatedAt": {
    "$date": "2025-12-03T13:27:16.465Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb22ad5fa3e5ac18e455e"
  },
  "product_name": "be good   20 inch special rim (gear)  |  بی گڈ 20 انچ اسپیشل رم (گیئر)",
  "product_category": "China Be Good(Cycle 2 Wheeler Kids)",
  "product_quantity": 4979,
  "retail_price": 28500,
  "wholesale_price": 21500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:28:26.986Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T14:17:55.544Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb279d5fa3e5ac18e4562"
  },
  "product_name": "be good   20 inch special rim  |  بی گڈ 20 انچ اسپیشل رم",
  "product_category": "China Be Good(Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 25500,
  "wholesale_price": 19600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:29:45.029Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:51:34.106Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb2aed5fa3e5ac18e4566"
  },
  "product_name": "be good   24 inch special rim (gear)  |  بی گڈ 24 انچ اسپیشل رم (گیئر)",
  "product_category": "China Be Good(Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 35000,
  "wholesale_price": 27500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:30:38.515Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:51:25.702Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb2d2d5fa3e5ac18e456a"
  },
  "product_name": "be good   26 inch special rim (gear)  |  بی گڈ 26 انچ اسپیشل رم (گیئر)",
  "product_category": "China Be Good(Cycle 2 Wheeler Kids)",
  "product_quantity": 4998,
  "retail_price": 36500,
  "wholesale_price": 29500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:31:14.419Z"
  },
  "updatedAt": {
    "$date": "2025-11-23T14:04:44.366Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb2f9d5fa3e5ac18e456e"
  },
  "product_name": "be good   26 inch (gear)  |  بی گڈ 26 انچ (گیئر)",
  "product_category": "China Be Good(Cycle 2 Wheeler Kids)",
  "product_quantity": 5000,
  "retail_price": 35000,
  "wholesale_price": 28500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:31:53.831Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:58:42.413Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb38ad5fa3e5ac18e4576"
  },
  "product_name": "sk   20 inch special rim  |  ایس کے 20 انچ اسپیشل رم",
  "product_category": "China SK (Cycle 2 Wheeler Kids)",
  "product_quantity": 4981,
  "retail_price": 26000,
  "wholesale_price": 19500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:34:18.876Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.847Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb3cfd5fa3e5ac18e457a"
  },
  "product_name": "sk   20 inch (mota tyre)  |  ایس کے 20 انچ (موٹا ٹائر)",
  "product_category": "China SK (Cycle 2 Wheeler Kids)",
  "product_quantity": 4997,
  "retail_price": 23500,
  "wholesale_price": 17500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:35:27.234Z"
  },
  "updatedAt": {
    "$date": "2025-10-27T07:32:03.484Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb48ad5fa3e5ac18e457e"
  },
  "product_name": "sk   20 inch (mota tyre music)  |  ایس کے 20 انچ (موٹا ٹائر میوزک)",
  "product_category": "China SK (Cycle 2 Wheeler Kids)",
  "product_quantity": 4999,
  "retail_price": 24000,
  "wholesale_price": 18100,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:38:34.331Z"
  },
  "updatedAt": {
    "$date": "2025-10-05T14:05:32.320Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb4b6d5fa3e5ac18e4582"
  },
  "product_name": "sk   12 inch (mota tyre)  |  ایس کے 12 انچ (موٹا ٹائر)",
  "product_category": "China SK (Cycle 2 Wheeler Kids)",
  "product_quantity": 4995,
  "retail_price": 16000,
  "wholesale_price": 12500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:39:18.044Z"
  },
  "updatedAt": {
    "$date": "2026-02-01T13:55:32.274Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb4e7d5fa3e5ac18e4586"
  },
  "product_name": "sk   16 inch (mota tyre)  |  ایس کے 16 انچ (موٹا ٹائر)",
  "product_category": "China SK (Cycle 2 Wheeler Kids)",
  "product_quantity": 4992,
  "retail_price": 18500,
  "wholesale_price": 14500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:40:07.038Z"
  },
  "updatedAt": {
    "$date": "2025-10-01T14:16:59.149Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb5b9d5fa3e5ac18e4591"
  },
  "product_name": "swimming pool   2 ft  |  سوئمنگ پول 2 فٹ",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 1550,
  "wholesale_price": 1050,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:43:37.230Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:08:37.432Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb5ded5fa3e5ac18e4595"
  },
  "product_name": "swimming pool   2 ft (vip)  |  سوئمنگ پول 2 فٹ (وی آئی پی)",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 1700,
  "wholesale_price": 1150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:44:14.637Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:08:30.033Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb607d5fa3e5ac18e4599"
  },
  "product_name": "swimming pool   3 ft  |  سوئمنگ پول 3 فٹ",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 2400,
  "wholesale_price": 1530,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:44:55.159Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:08:21.803Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb62ed5fa3e5ac18e459d"
  },
  "product_name": "swimming pool   3 ft (chawras)  |  سوئمنگ پول 3 فٹ (چورس)",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 3500,
  "wholesale_price": 2450,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:45:34.576Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:08:08.011Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb64ad5fa3e5ac18e45a1"
  },
  "product_name": "swimming pool   4 ft  |  سوئمنگ پول 4 فٹ",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 3500,
  "wholesale_price": 2450,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:46:02.939Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:08:00.469Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb68cd5fa3e5ac18e45a5"
  },
  "product_name": "swimming pool   5 ft (gol)  |  سوئمنگ پول 5 فٹ (گول)",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 5000,
  "wholesale_price": 3350,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:47:08.381Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:07:50.217Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb6c8d5fa3e5ac18e45a9"
  },
  "product_name": "swimming pool   4 ft (simple)  |  سوئمنگ پول 4 فٹ (سادہ)",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 3800,
  "wholesale_price": 2550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:48:08.380Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:07:42.527Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb6f1d5fa3e5ac18e45ad"
  },
  "product_name": "swimming pool   5 ft (simple)  |  سوئمنگ پول 5 فٹ (سادہ)",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 5000,
  "wholesale_price": 3400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:48:49.758Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:00:52.219Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb71ad5fa3e5ac18e45b1"
  },
  "product_name": "swimming pool   6 ft (chawras)  |  سوئمنگ پول 6 فٹ (چورس)",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 5500,
  "wholesale_price": 3450,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:49:30.871Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:00:31.754Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb73cd5fa3e5ac18e45b5"
  },
  "product_name": "swimming pool   6 ft (simple)  |  سوئمنگ پول 6 فٹ (سادہ)",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 6800,
  "wholesale_price": 4450,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:50:04.816Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:00:17.193Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb77bd5fa3e5ac18e45b9"
  },
  "product_name": "swimming pool   6 ft (gol 4 rings)  |  سوئمنگ پول 6 فٹ (گول 4 رنگز)",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 6800,
  "wholesale_price": 4850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:51:07.786Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:00:04.866Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb7aad5fa3e5ac18e45bd"
  },
  "product_name": "swimming pool   8 ft (simple)  |  سوئمنگ پول 8 فٹ (سادہ)",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 5000,
  "retail_price": 10500,
  "wholesale_price": 8400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:51:54.296Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:59:53.312Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb8c2d5fa3e5ac18e45c8"
  },
  "product_name": "501   slide (medium)  |  501 سلائیڈ (میڈیم)",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 4999,
  "retail_price": 7500,
  "wholesale_price": 5900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:56:34.816Z"
  },
  "updatedAt": {
    "$date": "2025-10-05T05:48:43.729Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb8e2d5fa3e5ac18e45cc"
  },
  "product_name": "502   slide (large)  |  502 سلائیڈ (لارج)",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 4997,
  "retail_price": 8500,
  "wholesale_price": 6850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:57:06.667Z"
  },
  "updatedAt": {
    "$date": "2025-10-29T06:55:25.265Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb914d5fa3e5ac18e45d0"
  },
  "product_name": "503   slide (jumbo)  |  503 سلائیڈ (جمبو)",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 4996,
  "retail_price": 16500,
  "wholesale_price": 13800,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:57:56.539Z"
  },
  "updatedAt": {
    "$date": "2026-01-17T14:38:10.029Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb940d5fa3e5ac18e45d4"
  },
  "product_name": "602   dolphin  |  602 ڈولفن",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 4912,
  "retail_price": 3800,
  "wholesale_price": 2950,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:58:40.465Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:48:37.854Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb95cd5fa3e5ac18e45d8"
  },
  "product_name": "601   dolphin  |  601 ڈولفن",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 19823,
  "retail_price": 4200,
  "wholesale_price": 3250,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T08:59:08.528Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb994d5fa3e5ac18e45dc"
  },
  "product_name": "611   dolphin (bullet train)  |  611 ڈولفن (بلٹ ٹرین)",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 4781,
  "retail_price": 4200,
  "wholesale_price": 3250,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:00:04.739Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb9c3d5fa3e5ac18e45e0"
  },
  "product_name": "612   dolphin  |  612 ڈولفن",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 5000,
  "retail_price": 3500,
  "wholesale_price": 2750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:00:51.266Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:14:54.400Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eb9fed5fa3e5ac18e45e4"
  },
  "product_name": "604   mini cooper  |  604 منی کوپر",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 4981,
  "retail_price": 3500,
  "wholesale_price": 2250,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:01:50.693Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T07:44:05.729Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eba1cd5fa3e5ac18e45e8"
  },
  "product_name": "603   new mini cooper  |  603 نیو منی کوپر",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 4966,
  "retail_price": 3800,
  "wholesale_price": 2550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:02:20.039Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T07:44:05.729Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eba3dd5fa3e5ac18e45ec"
  },
  "product_name": "608   junior mini cooper  |  608 جونیئر منی کوپر",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 4989,
  "retail_price": 3200,
  "wholesale_price": 2100,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:02:53.263Z"
  },
  "updatedAt": {
    "$date": "2026-01-17T13:54:15.447Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eba6cd5fa3e5ac18e45f0"
  },
  "product_name": "606   macalren  |  606 میک لارن",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 4954,
  "retail_price": 4200,
  "wholesale_price": 2750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:03:40.724Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.846Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eba95d5fa3e5ac18e45f4"
  },
  "product_name": "613   mini mercedez  |  613 منی مرسڈیز",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 5000,
  "retail_price": 4500,
  "wholesale_price": 3350,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:04:21.733Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:15:14.757Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebaebd5fa3e5ac18e45fc"
  },
  "product_name": "617   ranger car  |  617 رینجر کار",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 4925,
  "retail_price": 2500,
  "wholesale_price": 1650,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:05:47.814Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:32:00.085Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebb0dd5fa3e5ac18e4600"
  },
  "product_name": "618   sports car  |  618 اسپورٹس کار",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 5000,
  "retail_price": 2500,
  "wholesale_price": 1650,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:06:21.972Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:13:48.625Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebb39d5fa3e5ac18e4604"
  },
  "product_name": "605   mini stroller  |  605 منی اسٹرولر",
  "product_category": "Car (Stroller) mix",
  "product_quantity": 4961,
  "retail_price": 4500,
  "wholesale_price": 3300,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:07:05.228Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T07:44:05.729Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebb5ed5fa3e5ac18e4608"
  },
  "product_name": "607   smart stroller  |  607 اسمارٹ اسٹرولر",
  "product_category": "Car (Stroller) mix",
  "product_quantity": 4836,
  "retail_price": 4800,
  "wholesale_price": 3550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:07:42.143Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.847Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebb83d5fa3e5ac18e460c"
  },
  "product_name": "614   mercedez stroller  |  614 مرسڈیز اسٹرولر",
  "product_category": "Car (Stroller) mix",
  "product_quantity": 4975,
  "retail_price": 5500,
  "wholesale_price": 3900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:08:19.667Z"
  },
  "updatedAt": {
    "$date": "2026-01-17T14:38:10.029Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebbbdd5fa3e5ac18e4610"
  },
  "product_name": "202   potty tranier  |  202 پاٹی ٹرینر",
  "product_category": "Karachi Toyish-Land (Mix)",
  "product_quantity": 4978,
  "retail_price": 1800,
  "wholesale_price": 1450,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:09:17.134Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebcd5d5fa3e5ac18e461b"
  },
  "product_name": "402   dakyte bike  |  402 ڈکیت بائیک",
  "product_category": "Karachi Toyish-Land (Chargeble Bikes, Cars)",
  "product_quantity": 4998,
  "retail_price": 15000,
  "wholesale_price": 10500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:13:57.227Z"
  },
  "updatedAt": {
    "$date": "2025-12-28T13:22:49.042Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebd09d5fa3e5ac18e461f"
  },
  "product_name": "403   R-1 bike  |  403 آر-1 بائیک",
  "product_category": "Karachi Toyish-Land (Chargeble Bikes, Cars)",
  "product_quantity": 4986,
  "retail_price": 25000,
  "wholesale_price": 20500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:14:49.064Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:28:58.441Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebd3dd5fa3e5ac18e4623"
  },
  "product_name": "700   coopy car  |  700 کوپ کار",
  "product_category": "Karachi Toyish-Land (Chargeble Bikes, Cars)",
  "product_quantity": 4999,
  "retail_price": 15500,
  "wholesale_price": 11000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:15:41.889Z"
  },
  "updatedAt": {
    "$date": "2025-12-28T13:22:49.042Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebd66d5fa3e5ac18e4627"
  },
  "product_name": "701   S1 class  |  701 ایس 1 کلاس",
  "product_category": "Karachi Toyish-Land (Chargeble Bikes, Cars)",
  "product_quantity": 5000,
  "retail_price": 21000,
  "wholesale_price": 17500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:16:22.062Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:11:08.123Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebd8bd5fa3e5ac18e462b"
  },
  "product_name": "702   Hot racer  |  702 ہارٹ ریسر",
  "product_category": "Karachi Toyish-Land (Chargeble Bikes, Cars)",
  "product_quantity": 4992,
  "retail_price": 24500,
  "wholesale_price": 20500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:16:59.603Z"
  },
  "updatedAt": {
    "$date": "2026-01-17T14:38:10.029Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebdc1d5fa3e5ac18e462f"
  },
  "product_name": "703   Star rider  |  703 اسٹار رائڈر",
  "product_category": "Karachi Toyish-Land (Chargeble Bikes, Cars)",
  "product_quantity": 4999,
  "retail_price": 32000,
  "wholesale_price": 23500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:17:53.254Z"
  },
  "updatedAt": {
    "$date": "2026-01-17T14:38:10.029Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683ebde5d5fa3e5ac18e4633"
  },
  "product_name": "801   Chaser jeep  |  801 چیزر جیپ",
  "product_category": "Karachi Toyish-Land (Chargeble Bikes, Cars)",
  "product_quantity": 5000,
  "retail_price": 42000,
  "wholesale_price": 31500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T09:18:29.807Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:10:13.707Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eda36d5fa3e5ac18e483e"
  },
  "product_name": "chicago single  |  شکاگو سنگل",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4280,
  "retail_price": 2000,
  "wholesale_price": 1500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:19:18.849Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eda4fd5fa3e5ac18e4842"
  },
  "product_name": "chicago double  |  شکاگو ڈبل",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4746,
  "retail_price": 2200,
  "wholesale_price": 1750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:19:43.271Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eda6ed5fa3e5ac18e4846"
  },
  "product_name": "double rod double  |  ڈبل راڈ ڈبل",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4689,
  "retail_price": 2600,
  "wholesale_price": 2000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:20:14.748Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:22:43.596Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eda86d5fa3e5ac18e484a"
  },
  "product_name": "double rod single  |  ڈبل راڈ سنگل",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4692,
  "retail_price": 2400,
  "wholesale_price": 1800,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:20:38.014Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:22:43.596Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eda9fd5fa3e5ac18e484e"
  },
  "product_name": "D double (color jalai)  |  ڈی ڈبل (جالی)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4850,
  "retail_price": 2500,
  "wholesale_price": 1900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:21:03.005Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683edabbd5fa3e5ac18e4852"
  },
  "product_name": "D double (jalai lucky)  |  ڈی ڈبل (جالی لکی)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4892,
  "retail_price": 2400,
  "wholesale_price": 1810,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:21:31.035Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:12:36.380Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683edad6d5fa3e5ac18e4856"
  },
  "product_name": "double rod gol (foam)  |  ڈبل راڈ گول (فوم)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4927,
  "retail_price": 2500,
  "wholesale_price": 1950,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:21:58.179Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:18:58.776Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683edb10d5fa3e5ac18e485d"
  },
  "product_name": "diamond double (vip)  |  ڈائمنڈ ڈبل (وی آئی پی)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4956,
  "retail_price": 4000,
  "wholesale_price": 2900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:22:56.969Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:33:03.397Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683edb3bd5fa3e5ac18e4861"
  },
  "product_name": "diamond single (vip)  |  ڈائمنڈ سنگل (وی آئی پی)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4959,
  "retail_price": 3800,
  "wholesale_price": 2350,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:23:39.313Z"
  },
  "updatedAt": {
    "$date": "2026-01-14T13:59:14.286Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683edb5bd5fa3e5ac18e4865"
  },
  "product_name": "diamond double prince  |  ڈائمنڈ ڈبل پرنس",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4969,
  "retail_price": 4000,
  "wholesale_price": 2700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:24:11.840Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T14:26:20.148Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683edbddd5fa3e5ac18e4869"
  },
  "product_name": "diamond single prince  |  ڈائمنڈ سنگل پرنس",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4976,
  "retail_price": 3500,
  "wholesale_price": 2150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:26:21.611Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683edbfcd5fa3e5ac18e486d"
  },
  "product_name": "diamond double lucky  |  ڈائمنڈ ڈبل لکی",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4870,
  "retail_price": 3500,
  "wholesale_price": 2250,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:26:52.131Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:39:04.549Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683edc24d5fa3e5ac18e4871"
  },
  "product_name": "diamond single lucky  |  ڈائمنڈ سنگل لکی",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4922,
  "retail_price": 2800,
  "wholesale_price": 1750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:27:32.230Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:14:06.777Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683edc3cd5fa3e5ac18e4875"
  },
  "product_name": "city double (double seat)  |  سٹی ڈبل (ڈبل سیٹ)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4900,
  "retail_price": 4000,
  "wholesale_price": 2750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:27:56.780Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T14:10:57.852Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683edc57d5fa3e5ac18e4879"
  },
  "product_name": "city single  |  سٹی سنگل",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4928,
  "retail_price": 3500,
  "wholesale_price": 2200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:28:23.717Z"
  },
  "updatedAt": {
    "$date": "2026-01-25T14:02:03.720Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683edc70d5fa3e5ac18e487d"
  },
  "product_name": "shalimar double  |  شالیمار ڈبل",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4938,
  "retail_price": 4000,
  "wholesale_price": 2150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T11:28:48.275Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:33:03.397Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "683eea32d5fa3e5ac18e4881"
  },
  "product_name": "D-5 double (mota tyre jalai)  |  ڈی-5 ڈبل (موٹا ٹائر جالی)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4994,
  "retail_price": 2500,
  "wholesale_price": 1900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-03T12:27:30.471Z"
  },
  "updatedAt": {
    "$date": "2025-09-18T11:31:07.673Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401e8dd5fa3e5ac18e5348"
  },
  "product_name": "D single (jalai)  |  ڈی سنگل (جالی)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4907,
  "retail_price": 2200,
  "wholesale_price": 1550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:23:09.560Z"
  },
  "updatedAt": {
    "$date": "2025-12-13T13:17:59.630Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401eacd5fa3e5ac18e534c"
  },
  "product_name": "D single (color jalai)  |  ڈی سنگل (کلر جالی)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4816,
  "retail_price": 2200,
  "wholesale_price": 1550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:23:40.945Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401ec7d5fa3e5ac18e5350"
  },
  "product_name": "D single (band seat)  |  ڈی سنگل (بند سیٹ)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4665,
  "retail_price": 2000,
  "wholesale_price": 1500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:24:07.817Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401eded5fa3e5ac18e5354"
  },
  "product_name": "D single (mota tyre)  |  ڈی سنگل (موٹا ٹائر)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4997,
  "retail_price": 2200,
  "wholesale_price": 1550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:24:30.558Z"
  },
  "updatedAt": {
    "$date": "2025-09-16T08:56:48.269Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401ef5d5fa3e5ac18e5358"
  },
  "product_name": "D single (lucky)  |  ڈی سنگل (لکی)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4791,
  "retail_price": 2000,
  "wholesale_price": 1480,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:24:53.688Z"
  },
  "updatedAt": {
    "$date": "2026-01-25T14:02:03.720Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401f1fd5fa3e5ac18e535c"
  },
  "product_name": "D (chawras jalai)  |  ڈی (چورس جالی)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4906,
  "retail_price": 2000,
  "wholesale_price": 1480,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:25:35.732Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401f3dd5fa3e5ac18e5360"
  },
  "product_name": "chawras (lucky)  |  چورس (لکی)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4370,
  "retail_price": 1800,
  "wholesale_price": 1300,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:26:05.660Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:22:43.596Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401f5bd5fa3e5ac18e5364"
  },
  "product_name": "foam single  |  فوم سنگل",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4586,
  "retail_price": 1450,
  "wholesale_price": 1160,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:26:35.552Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:40:05.020Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401f76d5fa3e5ac18e5368"
  },
  "product_name": "sticker  |  اسٹیکر",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4884,
  "retail_price": 1450,
  "wholesale_price": 850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:27:02.983Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401f92d5fa3e5ac18e536c"
  },
  "product_name": "sticker (sofa)  |  اسٹیکر (صوفہ)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4981,
  "retail_price": 1500,
  "wholesale_price": 920,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:27:30.009Z"
  },
  "updatedAt": {
    "$date": "2026-01-14T13:59:14.286Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401fabd5fa3e5ac18e5370"
  },
  "product_name": "sticker (billi)  |  اسٹیکر (بلی)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4997,
  "retail_price": 1600,
  "wholesale_price": 1150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:27:55.010Z"
  },
  "updatedAt": {
    "$date": "2026-01-10T11:02:26.378Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401fd1d5fa3e5ac18e5374"
  },
  "product_name": "panda single  |  پانڈا سنگل",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4996,
  "retail_price": 2500,
  "wholesale_price": 1800,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:28:33.628Z"
  },
  "updatedAt": {
    "$date": "2025-12-16T12:31:36.173Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68401fefd5fa3e5ac18e5378"
  },
  "product_name": "spiderman hero  |  اسپائیڈر مین ہیرو",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4503,
  "retail_price": 2800,
  "wholesale_price": 2100,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:29:03.567Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6840200fd5fa3e5ac18e537c"
  },
  "product_name": "spiderman hero (music)  |  اسپائیڈر مین ہیرو (میوزک)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4971,
  "retail_price": 2600,
  "wholesale_price": 2000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:29:35.244Z"
  },
  "updatedAt": {
    "$date": "2026-01-11T13:42:13.384Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68402045d5fa3e5ac18e5380"
  },
  "product_name": "supari (double chawras)  |  سپاری (ڈبل چورس)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4960,
  "retail_price": 4500,
  "wholesale_price": 3150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:30:29.154Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68402088d5fa3e5ac18e5387"
  },
  "product_name": "supari single (foam)  |  سپاری سنگل (فوم)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4983,
  "retail_price": 3000,
  "wholesale_price": 2150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:31:36.615Z"
  },
  "updatedAt": {
    "$date": "2026-01-25T14:19:36.398Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684020b0d5fa3e5ac18e538b"
  },
  "product_name": "supari single (turbo foam)  |  سپاری سنگل (ٹربو فوم)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4995,
  "retail_price": 2800,
  "wholesale_price": 2050,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:32:16.728Z"
  },
  "updatedAt": {
    "$date": "2025-12-22T13:09:23.686Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684020d0d5fa3e5ac18e538f"
  },
  "product_name": "ranger single hero  |  رینجر سنگل ہیرو",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4993,
  "retail_price": 3500,
  "wholesale_price": 2550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:32:48.065Z"
  },
  "updatedAt": {
    "$date": "2025-10-08T12:38:11.805Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684020f1d5fa3e5ac18e5393"
  },
  "product_name": "flash pro hero (malak)  |  فلیش پرو ہیرو (ملک)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 5000,
  "retail_price": 3500,
  "wholesale_price": 2550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:33:21.866Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:25:59.434Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6840211fd5fa3e5ac18e5397"
  },
  "product_name": "spiderman honda  |  اسپائیڈر مین ہونڈا",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4994,
  "retail_price": 3800,
  "wholesale_price": 2550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:34:07.801Z"
  },
  "updatedAt": {
    "$date": "2026-01-18T08:35:11.162Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68402174d5fa3e5ac18e539b"
  },
  "product_name": "supari (billi foam)  |  سپاری (بلی فوم)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 5000,
  "retail_price": 2200,
  "wholesale_price": 1550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:35:32.463Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:25:39.515Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684021a6d5fa3e5ac18e539f"
  },
  "product_name": "supari kharghosht (686)  |  سپاری خرگوش (686)",
  "product_category": "Local items (Cycle 2 Wheeler)",
  "product_quantity": 4986,
  "retail_price": 2200,
  "wholesale_price": 1600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:36:22.102Z"
  },
  "updatedAt": {
    "$date": "2026-01-05T13:28:31.546Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68402266d5fa3e5ac18e53aa"
  },
  "product_name": "walker golden   12 wheel  |  واکر گولڈن 12 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4990,
  "retail_price": 6500,
  "wholesale_price": 4400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:39:34.301Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:40:05.020Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68402291d5fa3e5ac18e53ae"
  },
  "product_name": "walker china model (sitara)   12 wheel  |  واکر چائنا ماڈل (ستارہ) 12 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4942,
  "retail_price": 4800,
  "wholesale_price": 2400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:40:17.463Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:33:03.397Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684022c2d5fa3e5ac18e53b2"
  },
  "product_name": "walker mickey mouse (sitara)   12 wheel  |  واکر مکی ماؤس (ستارہ) 12 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4996,
  "retail_price": 5000,
  "wholesale_price": 2650,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:41:06.480Z"
  },
  "updatedAt": {
    "$date": "2026-01-01T12:58:35.709Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684022e0d5fa3e5ac18e53b6"
  },
  "product_name": "walker china model (king)   12 wheel  |  واکر چائنا ماڈل (کنگ) 12 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4913,
  "retail_price": 4200,
  "wholesale_price": 2350,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:41:36.909Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:32:00.085Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68402320d5fa3e5ac18e53ba"
  },
  "product_name": "walker china model (best)   12 wheel  |  واکر چائنا ماڈل (بیسٹ) 12 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4999,
  "retail_price": 4000,
  "wholesale_price": 2300,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:42:40.910Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:39:04.549Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68402344d5fa3e5ac18e53be"
  },
  "product_name": "walker pak   12 wheel  |  واکر پاک 12 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4883,
  "retail_price": 4000,
  "wholesale_price": 2300,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:43:16.399Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68402419d5fa3e5ac18e53c2"
  },
  "product_name": "walker (555)   12 wheel  |  واکر (555) 12 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 5000,
  "retail_price": 3800,
  "wholesale_price": 2150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:46:49.402Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:24:03.774Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684024dfd5fa3e5ac18e53de"
  },
  "product_name": "walker model (141)   10 wheel  |  واکر ماڈل (141) 10 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4967,
  "retail_price": 3500,
  "wholesale_price": 2100,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:50:07.942Z"
  },
  "updatedAt": {
    "$date": "2026-01-31T13:37:58.011Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68402500d5fa3e5ac18e53e2"
  },
  "product_name": "walker model (777)   12 wheel  |  واکر ماڈل (777) 12 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4958,
  "retail_price": 4000,
  "wholesale_price": 2250,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:50:40.442Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:33:03.397Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6840253ed5fa3e5ac18e53e6"
  },
  "product_name": "walker model (777 FA)   10 wheel  |  واکر ماڈل (777 ایف اے) 10 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4800,
  "retail_price": 2400,
  "wholesale_price": 1550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:51:42.080Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:48:37.854Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68402563d5fa3e5ac18e53ea"
  },
  "product_name": "walker model (111 billi)   8 wheel  |  واکر ماڈل (111 بلی) 8 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4761,
  "retail_price": 2200,
  "wholesale_price": 1500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:52:19.531Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6840258bd5fa3e5ac18e53ee"
  },
  "product_name": "walker model (333 FA)   8 wheel  |  واکر ماڈل (333 ایف اے) 8 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4443,
  "retail_price": 1600,
  "wholesale_price": 1150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:52:59.196Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684025d0d5fa3e5ac18e53f5"
  },
  "product_name": "walker china model (ajwa)   12 wheel  |  واکر چائنا ماڈل (عجوہ) 12 وہیل",
  "product_category": "Ajwa items",
  "product_quantity": 4985,
  "retail_price": 2400,
  "wholesale_price": 1600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:54:08.610Z"
  },
  "updatedAt": {
    "$date": "2026-01-22T12:42:48.652Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684025f8d5fa3e5ac18e53f9"
  },
  "product_name": "walker (ajwa)   6 wheel  |  واکر (عجوہ) 6 وہیل",
  "product_category": "Ajwa items",
  "product_quantity": 4649,
  "retail_price": 1100,
  "wholesale_price": 900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:54:48.838Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6840262fd5fa3e5ac18e53fd"
  },
  "product_name": "walker model (121)   12 wheel  |  واکر ماڈل (121) 12 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4981,
  "retail_price": 4500,
  "wholesale_price": 2400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:55:43.951Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:05:44.977Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68402654d5fa3e5ac18e5401"
  },
  "product_name": "walker model (404)   12 wheel  |  واکر ماڈل (404) 12 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4993,
  "retail_price": 3800,
  "wholesale_price": 2200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-04T10:56:20.882Z"
  },
  "updatedAt": {
    "$date": "2026-01-19T13:32:31.788Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68418267d5fa3e5ac18e6c78"
  },
  "product_name": "walker gol (plastic) 8 wheel  |  واکر گول (پلاسٹک) 8 وہیل",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4938,
  "retail_price": 1800,
  "wholesale_price": 1260,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-05T11:41:27.031Z"
  },
  "updatedAt": {
    "$date": "2026-01-01T13:47:21.322Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68418293d5fa3e5ac18e6c7c"
  },
  "product_name": "walker gol (foam)  |  واکر گول (فوم)",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 5000,
  "retail_price": 1300,
  "wholesale_price": 1050,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-05T11:42:11.234Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:22:22.271Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684182bdd5fa3e5ac18e6c80"
  },
  "product_name": "walker gol (mazur 3 step)  |  واکر گول (معذور 3 اسٹیپ)",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4979,
  "retail_price": 4500,
  "wholesale_price": 3200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-05T11:42:53.723Z"
  },
  "updatedAt": {
    "$date": "2026-01-22T12:42:48.652Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684182ded5fa3e5ac18e6c84"
  },
  "product_name": "walker gol (mazur 2 step)  |  واکر گول (معذور 2 اسٹیپ)",
  "product_category": "Local Items (walker kids)",
  "product_quantity": 4970,
  "retail_price": 4200,
  "wholesale_price": 3000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-05T11:43:26.497Z"
  },
  "updatedAt": {
    "$date": "2025-12-31T13:42:09.188Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684942b08b47390125594709"
  },
  "product_name": "D double (nicel jalai)  |  ڈی ڈبل (نکل جالی)",
  "product_category": "Local Items (cycle 3 wheeler)",
  "product_quantity": 4839,
  "retail_price": 2500,
  "wholesale_price": 1900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T08:47:44.595Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6849436f8b47390125594714"
  },
  "product_name": "D single (nicel)  |  ڈی سنگل (نکل)",
  "product_category": "Local Items (cycle 3 wheeler)",
  "product_quantity": 4747,
  "retail_price": 2200,
  "wholesale_price": 1550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T08:50:55.693Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684943b28b47390125594718"
  },
  "product_name": "titan double (new)  |  ٹائٹن ڈبل (نیو)",
  "product_category": "Local Items (cycle 3 wheeler)",
  "product_quantity": 4913,
  "retail_price": 5500,
  "wholesale_price": 4100,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T08:52:02.179Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684944508b47390125594720"
  },
  "product_name": "simsim   12 inch (double brake foam)  |  سم سم 12 انچ (ڈبل بریک فوم)",
  "product_category": "Flying Eagle (Cycle 2 Wheelers Kids)",
  "product_quantity": 4969,
  "retail_price": 7500,
  "wholesale_price": 5600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T08:54:40.181Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T07:48:54.393Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684944dc8b4739012559472b"
  },
  "product_name": "yellow cap (car)  |  ییلو کیپ (کار)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4913,
  "retail_price": 4800,
  "wholesale_price": 3200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T08:57:00.706Z"
  },
  "updatedAt": {
    "$date": "2026-01-25T14:02:03.720Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684951188b47390125594790"
  },
  "product_name": "ajwa car  |  عجوہ کار",
  "product_category": "Ajwa items",
  "product_quantity": 4682,
  "retail_price": 1600,
  "wholesale_price": 1250,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T09:49:12.064Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68495baf8b47390125594794"
  },
  "product_name": "master car dhoom  |  ماسٹر کار دھوم",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4545,
  "retail_price": 1400,
  "wholesale_price": 920,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:34:23.101Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68495be98b47390125594798"
  },
  "product_name": "car halka  |  کار ہلکا",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 1150,
  "wholesale_price": 750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:35:21.048Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:20:20.251Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68495c1a8b4739012559479c"
  },
  "product_name": "car mickey mouse  |  کار مکی ماؤس",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4860,
  "retail_price": 2200,
  "wholesale_price": 1500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:36:10.715Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68495c5e8b473901255947a0"
  },
  "product_name": "jungly car  |  جنگلی کار",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4985,
  "retail_price": 2000,
  "wholesale_price": 1280,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:37:18.461Z"
  },
  "updatedAt": {
    "$date": "2025-12-29T13:30:00.651Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68495c928b473901255947a4"
  },
  "product_name": "car party  |  کار پارٹی",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 1500,
  "wholesale_price": 1160,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:38:10.473Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:20:40.211Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68495cba8b473901255947a8"
  },
  "product_name": "car 797  |  کار 797",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4908,
  "retail_price": 3500,
  "wholesale_price": 2500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:38:50.020Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68495ce08b473901255947ac"
  },
  "product_name": "car ideal  |  کار آئیڈیل",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 3000,
  "wholesale_price": 1900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:39:28.446Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:19:33.664Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68495d1b8b473901255947b0"
  },
  "product_name": "car Mco   model (801)  |  کار ایمکو ماڈل (801)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 3500,
  "wholesale_price": 1950,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:40:27.929Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:19:25.920Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68495d368b473901255947b4"
  },
  "product_name": "car Mco   model (802)  |  کار ایمکو ماڈل (802)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 3800,
  "wholesale_price": 2200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:40:54.625Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:19:19.086Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68495d5f8b473901255947b8"
  },
  "product_name": "car (69)  |  کار (69)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4984,
  "retail_price": 1800,
  "wholesale_price": 1400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:41:35.995Z"
  },
  "updatedAt": {
    "$date": "2026-01-11T13:42:13.384Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68495fe68b473901255947bc"
  },
  "product_name": "sweety no.1 car (tollo)  |  سویٹی نمبر 1 کار (ٹولو)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4979,
  "retail_price": 2800,
  "wholesale_price": 1850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:52:22.656Z"
  },
  "updatedAt": {
    "$date": "2026-01-22T12:42:48.652Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6849603d8b473901255947c0"
  },
  "product_name": "sweety no.2 car (tollo)  |  سویٹی نمبر 2 کار (ٹولو)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 2300,
  "wholesale_price": 1600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:53:49.592Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:18:50.470Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684960748b473901255947c7"
  },
  "product_name": "car junior 666 (malak)  |  کار جونیئر 666 (ملک)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4976,
  "retail_price": 2500,
  "wholesale_price": 1750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:54:44.276Z"
  },
  "updatedAt": {
    "$date": "2026-01-25T14:19:36.398Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684961168b473901255947cb"
  },
  "product_name": "car 009 (malak)  |  کار 009 (ملک)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4995,
  "retail_price": 3500,
  "wholesale_price": 2300,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T10:57:26.376Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684961f68b473901255947d2"
  },
  "product_name": "jeep ranger 1401  |  جیپ رینجر 1401",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4861,
  "retail_price": 4000,
  "wholesale_price": 2550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:01:10.054Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:01:25.598Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6849621d8b473901255947d6"
  },
  "product_name": "jeep ranger 1402 stroller  |  جیپ رینجر 1402 اسٹرولر",
  "product_category": "Car (Stroller) mix",
  "product_quantity": 4974,
  "retail_price": 4500,
  "wholesale_price": 3250,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:01:49.797Z"
  },
  "updatedAt": {
    "$date": "2026-01-11T13:42:13.384Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6849628d8b473901255947da"
  },
  "product_name": "car 804  |  کار 804",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4978,
  "retail_price": 3800,
  "wholesale_price": 2350,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:03:41.391Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T14:00:12.929Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684962c08b473901255947de"
  },
  "product_name": "car model 805 stroller  |  کار ماڈل 805 اسٹرولر",
  "product_category": "Car (Stroller) mix",
  "product_quantity": 4976,
  "retail_price": 4400,
  "wholesale_price": 3050,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:04:32.531Z"
  },
  "updatedAt": {
    "$date": "2026-01-14T13:59:14.286Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684963028b473901255947e2"
  },
  "product_name": "car model 725 stroller  |  کار ماڈل 725 اسٹرولر",
  "product_category": "Car (Stroller) mix",
  "product_quantity": 4974,
  "retail_price": 4000,
  "wholesale_price": 2900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:05:38.819Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:48:37.854Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6849632d8b473901255947e6"
  },
  "product_name": "car model 503 stroller  |  کار ماڈل 503 اسٹرولر",
  "product_category": "Car (Stroller) mix",
  "product_quantity": 4950,
  "retail_price": 3500,
  "wholesale_price": 2650,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:06:21.420Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:18:20.104Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684963618b473901255947ea"
  },
  "product_name": "car model 777 stroller  |  کار ماڈل 777 اسٹرولر",
  "product_category": "Car (Stroller) mix",
  "product_quantity": 4959,
  "retail_price": 3800,
  "wholesale_price": 2650,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:07:13.038Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T12:35:56.620Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684963938b473901255947ee"
  },
  "product_name": "car model 111 stroller  |  کار ماڈل 111 اسٹرولر",
  "product_category": "Car (Stroller) mix",
  "product_quantity": 4989,
  "retail_price": 3500,
  "wholesale_price": 2650,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:08:03.562Z"
  },
  "updatedAt": {
    "$date": "2025-11-01T14:19:17.276Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684963cb8b473901255947f2"
  },
  "product_name": "car model 518 stroller  |  کار ماڈل 518 اسٹرولر",
  "product_category": "Car (Stroller) mix",
  "product_quantity": 5000,
  "retail_price": 8500,
  "wholesale_price": 5800,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:08:59.836Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:48:50.591Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684967028b473901255947fd"
  },
  "product_name": "car singing tom  |  کار سنگنگ ٹام",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 3800,
  "wholesale_price": 2750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:22:42.728Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:18:09.301Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6849675b8b47390125594801"
  },
  "product_name": "car ducking model 601 (billi)  |  کار ڈکنگ ماڈل 601 (بلی)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 3500,
  "wholesale_price": 2050,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:24:11.925Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:18:01.013Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6849677f8b47390125594805"
  },
  "product_name": "car ducking model 602 (billi)  |  کار ڈکنگ ماڈل 602 (بلی)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 3800,
  "wholesale_price": 2200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:24:47.758Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:17:53.610Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684967d28b47390125594828"
  },
  "product_name": "car Mco model 921  |  کار ایمکو ماڈل 921",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4989,
  "retail_price": 4000,
  "wholesale_price": 2750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:26:10.619Z"
  },
  "updatedAt": {
    "$date": "2026-01-14T13:59:14.286Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684968088b4739012559482c"
  },
  "product_name": "car Mco model 922  |  کار ایمکو ماڈل 922",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4994,
  "retail_price": 4500,
  "wholesale_price": 2850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:27:04.264Z"
  },
  "updatedAt": {
    "$date": "2026-01-20T13:44:06.379Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684968398b47390125594830"
  },
  "product_name": "jeep Mco model no.902  |  جیپ ایمکو ماڈل نمبر 902",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4811,
  "retail_price": 4000,
  "wholesale_price": 2750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:27:53.755Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:48:37.854Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684968638b47390125594834"
  },
  "product_name": "jeep Mco model no.907 (stroller)  |  جیپ ایمکو ماڈل نمبر 907 (اسٹرولر)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4954,
  "retail_price": 5500,
  "wholesale_price": 3600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:28:35.616Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:40:05.020Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684968888b47390125594838"
  },
  "product_name": "jeep (malak)  |  جیپ (ملک)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 3500,
  "wholesale_price": 2200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:29:12.045Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:17:13.693Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684968aa8b4739012559483c"
  },
  "product_name": "jeep stroller (malak)  |  جیپ اسٹرولر (ملک)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 4500,
  "wholesale_price": 2850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:29:46.477Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:17:06.234Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684968ce8b47390125594840"
  },
  "product_name": "car mercedez  |  کار مرسڈیز",
  "product_category": "Local Items (CAR)",
  "product_quantity": 4951,
  "retail_price": 3800,
  "wholesale_price": 2000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:30:22.417Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:32:00.085Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "684969348b47390125594847"
  },
  "product_name": "car cooper 555 (malak)  |  کار کوپر 555 (ملک)",
  "product_category": "Local Items (CAR)",
  "product_quantity": 5000,
  "retail_price": 3500,
  "wholesale_price": 1900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-11T11:32:04.235Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:16:51.989Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685290298b47390125594f73"
  },
  "product_name": "gora master bugy (music)  |  گورا ماسٹر بگی (میوزک)",
  "product_category": "Gora",
  "product_quantity": 4923,
  "retail_price": 1400,
  "wholesale_price": 980,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:08:41.027Z"
  },
  "updatedAt": {
    "$date": "2026-01-10T14:23:02.523Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685290528b47390125594f77"
  },
  "product_name": "gora jumbo  |  گورا جمبو",
  "product_category": "Gora",
  "product_quantity": 4793,
  "retail_price": 850,
  "wholesale_price": 570,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:09:22.525Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852908e8b47390125594f7b"
  },
  "product_name": "carry-coat (jalai)  |  کیری کوٹ (جالی)",
  "product_category": "Carry-Coat",
  "product_quantity": 4999,
  "retail_price": 1300,
  "wholesale_price": 950,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:10:22.812Z"
  },
  "updatedAt": {
    "$date": "2025-09-16T14:48:51.259Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685290c28b47390125594f7f"
  },
  "product_name": "carry_coat simple  |  کیری کوٹ سادہ",
  "product_category": "Carry-Coat",
  "product_quantity": 5000,
  "retail_price": 1200,
  "wholesale_price": 850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:11:14.474Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:50:57.055Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685291048b47390125594f83"
  },
  "product_name": "carry-coat 3 in 1 sitara (vip)  |  کیری کوٹ 3 ان 1 ستارہ (وی آئی پی)",
  "product_category": "Carry-Coat",
  "product_quantity": 4900,
  "retail_price": 3500,
  "wholesale_price": 2300,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:12:20.063Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852914c8b47390125594f87"
  },
  "product_name": "carry-coat 3 in 1 ajwa  |  کیری کوٹ 3 ان 1 عجوہ",
  "product_category": "Carry-Coat",
  "product_quantity": 4960,
  "retail_price": 3200,
  "wholesale_price": 2050,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:13:32.892Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685291818b47390125594f8b"
  },
  "product_name": "carry-coat jalai (vip FA)  |  کیری کوٹ جالی (وی آئی پی ایف اے)",
  "product_category": "Carry-Coat",
  "product_quantity": 4946,
  "retail_price": 1650,
  "wholesale_price": 1250,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:14:25.300Z"
  },
  "updatedAt": {
    "$date": "2026-01-31T13:43:11.485Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685291b98b47390125594f8f"
  },
  "product_name": "carry-coat simple (vip FA)  |  کیری کوٹ سادہ (وی آئی پی ایف اے)",
  "product_category": "Carry-Coat",
  "product_quantity": 4989,
  "retail_price": 1500,
  "wholesale_price": 1150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:15:21.640Z"
  },
  "updatedAt": {
    "$date": "2025-10-27T14:09:59.018Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685292058b47390125594f93"
  },
  "product_name": "taal simple cloth  |  تال سادہ کپڑا",
  "product_category": "Taal",
  "product_quantity": 4994,
  "retail_price": 500,
  "wholesale_price": 270,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:16:37.585Z"
  },
  "updatedAt": {
    "$date": "2026-01-18T13:38:48.703Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685292288b47390125594f97"
  },
  "product_name": "taal single spring cloth  |  تال سنگل اسپرنگ کپڑا",
  "product_category": "Taal",
  "product_quantity": 4784,
  "retail_price": 600,
  "wholesale_price": 330,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:17:12.628Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:39:04.549Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685292588b47390125594f9b"
  },
  "product_name": "taal double spring gol cloth  |  تال ڈبل اسپرنگ گول کپڑا",
  "product_category": "Taal",
  "product_quantity": 4917,
  "retail_price": 700,
  "wholesale_price": 400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:18:00.568Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:39:04.549Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685292db8b47390125594f9f"
  },
  "product_name": "taal double spring chawras  |  تال ڈبل اسپرنگ چورس",
  "product_category": "Taal",
  "product_quantity": 4863,
  "retail_price": 750,
  "wholesale_price": 430,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:20:11.711Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:39:04.549Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852940c8b47390125594fa3"
  },
  "product_name": "jhula bacha-minar 5 rod bearing  |  جھولا بچہ مینار 5 راڈ بیرنگ",
  "product_category": "Jhula",
  "product_quantity": 4979,
  "retail_price": 7800,
  "wholesale_price": 5850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:25:16.778Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T12:35:56.620Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852945c8b47390125594fa7"
  },
  "product_name": "jhula new 5 rod   1 inch  |  جھولا نیو 5 راڈ 1 انچ",
  "product_category": "Jhula",
  "product_quantity": 4987,
  "retail_price": 5500,
  "wholesale_price": 3900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:26:36.033Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T13:51:28.063Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685294cb8b47390125594fab"
  },
  "product_name": "jhula motti 5 rod bearing  |  جھولا موٹی 5 راڈ بیرنگ",
  "product_category": "Jhula",
  "product_quantity": 4985,
  "retail_price": 7000,
  "wholesale_price": 4750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:28:27.811Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:25:53.372Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685294f58b47390125594faf"
  },
  "product_name": "jhula fuwara 5 rod bearing  |  جھولا فوارہ 5 راڈ بیرنگ",
  "product_category": "Jhula",
  "product_quantity": 4978,
  "retail_price": 6800,
  "wholesale_price": 4600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:29:09.531Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T13:51:28.063Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685295308b47390125594fb3"
  },
  "product_name": "jhula motti 3 rod simple  |  جھولا موٹی 3 راڈ سادہ",
  "product_category": "Jhula",
  "product_quantity": 4982,
  "retail_price": 5400,
  "wholesale_price": 3900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:30:08.536Z"
  },
  "updatedAt": {
    "$date": "2026-01-13T08:30:32.008Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685295648b47390125594fb7"
  },
  "product_name": "jhula fuwara 3 rod simple  |  جھولا فوارہ 3 راڈ سادہ",
  "product_category": "Jhula",
  "product_quantity": 4988,
  "retail_price": 5200,
  "wholesale_price": 3700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T10:31:00.997Z"
  },
  "updatedAt": {
    "$date": "2025-12-16T12:31:36.173Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852a8258b47390125595177"
  },
  "product_name": "Mother-care  |  مدر کیئر",
  "product_category": "China jhula",
  "product_quantity": 4998,
  "retail_price": 28500,
  "wholesale_price": 19500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T11:51:01.608Z"
  },
  "updatedAt": {
    "$date": "2025-11-24T13:41:15.755Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852a8fc8b4739012559517e"
  },
  "product_name": "Mastela 3 in 1  |  مسٹیلا 3 ان 1",
  "product_category": "China jhula",
  "product_quantity": 4997,
  "retail_price": 18500,
  "wholesale_price": 15500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T11:54:36.541Z"
  },
  "updatedAt": {
    "$date": "2025-12-21T07:13:51.889Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852a9348b47390125595182"
  },
  "product_name": "Mastela 4 in 1  |  مسٹیلا 4 ان 1",
  "product_category": "China jhula",
  "product_quantity": 4999,
  "retail_price": 26000,
  "wholesale_price": 16500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T11:55:32.363Z"
  },
  "updatedAt": {
    "$date": "2025-10-29T06:55:25.265Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852a95c8b47390125595186"
  },
  "product_name": "Mastela Deluxe  |  مسٹیلا ڈیلکس",
  "product_category": "China jhula",
  "product_quantity": 5000,
  "retail_price": 17500,
  "wholesale_price": 13500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T11:56:12.895Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:54:08.520Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852a9c68b4739012559518a"
  },
  "product_name": "Mastela Baby Electric Bed Swing  |  مسٹیلا بیبی الیکٹرک بیڈ سوئنگ",
  "product_category": "China jhula",
  "product_quantity": 5000,
  "retail_price": 45000,
  "wholesale_price": 35000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T11:57:58.940Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:53:55.055Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852acde8b473901255951ff"
  },
  "product_name": "Inguenity Smart Baby Swing  |  انجینیوٹی اسمارٹ بیبی سوئنگ",
  "product_category": "China jhula",
  "product_quantity": 5000,
  "retail_price": 50000,
  "wholesale_price": 41000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T12:11:10.773Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:53:44.359Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852ad358b47390125595206"
  },
  "product_name": "Mastela Vibrator Baby Swing  |  مسٹیلا وائبریٹر بیبی سوئنگ",
  "product_category": "China jhula",
  "product_quantity": 4998,
  "retail_price": 20000,
  "wholesale_price": 16000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T12:12:37.027Z"
  },
  "updatedAt": {
    "$date": "2025-12-21T07:13:51.889Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852ad7c8b4739012559520a"
  },
  "product_name": "China Baby Swing  |  چائنا بیبی سوئنگ",
  "product_category": "China jhula",
  "product_quantity": 5000,
  "retail_price": 18000,
  "wholesale_price": 14000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T12:13:48.654Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:53:24.099Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852adbd8b4739012559520e"
  },
  "product_name": "China Baby Swing 3 in 1  |  چائنا بیبی سوئنگ 3 ان 1",
  "product_category": "China jhula",
  "product_quantity": 5000,
  "retail_price": 18000,
  "wholesale_price": 14000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T12:14:53.987Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:53:16.866Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6852ade68b47390125595212"
  },
  "product_name": "Vibrator Baby Swing  |  وائبریٹر بیبی سوئنگ",
  "product_category": "China jhula",
  "product_quantity": 5000,
  "retail_price": 15000,
  "wholesale_price": 11000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-18T12:15:34.066Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:53:05.955Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685f96d68b473901255959d5"
  },
  "product_name": "gora sada seat  |  گورا سادہ سیٹ",
  "product_category": "local (mix)",
  "product_quantity": 4641,
  "retail_price": 1000,
  "wholesale_price": 750,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-28T07:16:38.821Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685f97de8b473901255959d9"
  },
  "product_name": "D-5 lucky  |  ڈی-5 لکی",
  "product_category": "local (mix)",
  "product_quantity": 5000,
  "retail_price": 2000,
  "wholesale_price": 1500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-28T07:21:02.968Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:11:42.301Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "685f98438b473901255959dd"
  },
  "product_name": "chawras dekato  |  چورس ڈیکاٹو",
  "product_category": "local (mix)",
  "product_quantity": 5000,
  "retail_price": 2000,
  "wholesale_price": 1500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-06-28T07:22:43.730Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:11:34.628Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686377aa8b47390125595d5d"
  },
  "product_name": "double road double prince  |  ڈبل روڈ ڈبل پرنس",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 4000,
  "wholesale_price": 2800,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T05:52:42.666Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:47:49.481Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686377cb8b47390125595d61"
  },
  "product_name": "jeep racer golden  |  جیپ ریسر گولڈن",
  "product_category": "Uncategorized",
  "product_quantity": 4969,
  "retail_price": 4000,
  "wholesale_price": 2550,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T05:53:15.756Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:18:20.104Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686377fd8b47390125595d65"
  },
  "product_name": "jeep tesla Mco  |  جیپ ٹیسلا ایمکو",
  "product_category": "Uncategorized",
  "product_quantity": 4796,
  "retail_price": 4500,
  "wholesale_price": 2800,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T05:54:05.977Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:32:00.085Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6863782f8b47390125595d69"
  },
  "product_name": "happy china double  |  ہیپی چائنا ڈبل",
  "product_category": "Uncategorized",
  "product_quantity": 4994,
  "retail_price": 6000,
  "wholesale_price": 4450,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T05:54:55.277Z"
  },
  "updatedAt": {
    "$date": "2025-11-01T14:19:17.276Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686378cf8b47390125595d6d"
  },
  "product_name": "chargeable P5588  |  چارج ایبل پی5588",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 26000,
  "wholesale_price": 18500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T05:57:35.060Z"
  },
  "updatedAt": {
    "$date": "2025-11-10T13:04:04.479Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686378ff8b47390125595d71"
  },
  "product_name": "chargeable model 1900  |  چارج ایبل ماڈل 1900",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 24000,
  "wholesale_price": 17500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T05:58:23.773Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.847Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686379418b47390125595d75"
  },
  "product_name": "chargeable simple 5588  |  چارج ایبل سادہ 5588",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 26000,
  "wholesale_price": 18000,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T05:59:29.409Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:47:19.573Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6863799f8b47390125595d7c"
  },
  "product_name": "chargeable 1088 screen light  |  چارج ایبل 1088 اسکرین لائٹ",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 28000,
  "wholesale_price": 19500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T06:01:03.220Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:47:09.870Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68637af18b47390125595dd6"
  },
  "product_name": "Taal JoJo plastic  |  تال جوجو پلاسٹک",
  "product_category": "Taal",
  "product_quantity": 4936,
  "retail_price": 780,
  "wholesale_price": 560,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T06:06:41.949Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T14:01:08.132Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68637b258b47390125595dda"
  },
  "product_name": "Taal sofa karchi  |  تال صوفہ کراچی",
  "product_category": "Taal",
  "product_quantity": 4931,
  "retail_price": 780,
  "wholesale_price": 560,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T06:07:33.282Z"
  },
  "updatedAt": {
    "$date": "2026-01-25T14:19:36.398Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68637b9e8b47390125595dde"
  },
  "product_name": "Taal sofa music malak  |  تال صوفہ میوزک ملک",
  "product_category": "Taal",
  "product_quantity": 4898,
  "retail_price": 1350,
  "wholesale_price": 900,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T06:09:34.275Z"
  },
  "updatedAt": {
    "$date": "2026-01-25T14:19:36.398Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68637bef8b47390125595de2"
  },
  "product_name": "Taal sofa sitara  |  تال صوفہ ستارہ",
  "product_category": "Taal",
  "product_quantity": 4942,
  "retail_price": 1450,
  "wholesale_price": 930,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T06:10:55.440Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68637c108b47390125595de6"
  },
  "product_name": "Taal sofa music best  |  تال صوفہ میوزک بیسٹ",
  "product_category": "Taal",
  "product_quantity": 5000,
  "retail_price": 1250,
  "wholesale_price": 800,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T06:11:28.733Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T08:11:58.991Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68637c578b47390125595dea"
  },
  "product_name": "master cycle X2  |  ماسٹر سائیکل ایکس 2",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 3500,
  "wholesale_price": 2100,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T06:12:39.124Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:47:02.838Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68637d048b47390125595dee"
  },
  "product_name": "Ben 10 supra (foam)  |  بین 10 سپرا (فوم)",
  "product_category": "Uncategorized",
  "product_quantity": 4961,
  "retail_price": 4600,
  "wholesale_price": 3700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T06:15:32.667Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:03:10.010Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686384f48b47390125595e95"
  },
  "product_name": "YS mota tyre   20 inch  |  وائی ایس موٹا ٹائر 20 انچ",
  "product_category": "Uncategorized",
  "product_quantity": 4878,
  "retail_price": 16000,
  "wholesale_price": 13600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T06:49:24.020Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:46:00.066Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68638adc8b47390125596003"
  },
  "product_name": "Sezo Single Cycle  |  سیزو سنگل سائیکل",
  "product_category": "Uncategorized",
  "product_quantity": 4892,
  "retail_price": 2200,
  "wholesale_price": 1600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T07:14:36.718Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:48:37.854Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68638d1f8b4739012559600e"
  },
  "product_name": "Jeep Mco model 901  |  جیپ ایمکو ماڈل 901",
  "product_category": "Uncategorized",
  "product_quantity": 4963,
  "retail_price": 3800,
  "wholesale_price": 2650,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T07:24:15.200Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:26:05.439Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6863955f8b473901255960bc"
  },
  "product_name": "(malak) single (nicel jalai)  |  (ملک) سنگل (نکل جالی)",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 2500,
  "wholesale_price": 1950,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T07:59:27.321Z"
  },
  "updatedAt": {
    "$date": "2025-09-17T14:20:29.438Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686397bb8b473901255960c3"
  },
  "product_name": "hero double vip cycle  |  صوفہ ڈبل (وی آئی پی) سائیکل",
  "product_category": "Uncategorized",
  "product_quantity": 4982,
  "retail_price": 5500,
  "wholesale_price": 3700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:09:31.684Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686397e78b473901255960c7"
  },
  "product_name": "Sofa SIngle gol  005 |  صوفہ سنگل گول",
  "product_category": "Uncategorized",
  "product_quantity": 4790,
  "retail_price": 4000,
  "wholesale_price": 2950,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:10:15.169Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68639e5d8b473901255961a1"
  },
  "product_name": "single vip chawras 001  |  سنگل وی آئی پی چورس",
  "product_category": "Uncategorized",
  "product_quantity": 4887,
  "retail_price": 2800,
  "wholesale_price": 2700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:37:49.025Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68639e8a8b473901255961a5"
  },
  "product_name": "double vip chawras 002  |  ڈبل وی آئی پی چورس",
  "product_category": "Uncategorized",
  "product_quantity": 4857,
  "retail_price": 4500,
  "wholesale_price": 3100,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:38:34.657Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68639eb48b473901255961a9"
  },
  "product_name": "hero single vip cycle  |  صوفہ سنگل وی آئی پی",
  "product_category": "Uncategorized",
  "product_quantity": 4784,
  "retail_price": 4500,
  "wholesale_price": 3150,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:39:16.896Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68639f358b473901255961ad"
  },
  "product_name": "sofa double gol 006 |  صوفہ ڈبل گول",
  "product_category": "Uncategorized",
  "product_quantity": 5784,
  "retail_price": 4800,
  "wholesale_price": 3400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:41:25.158Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6863a03d8b473901255961b1"
  },
  "product_name": "car 52  |  کار 52",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 4800,
  "wholesale_price": 3300,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:45:49.149Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:45:44.979Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6863a05e8b473901255961b5"
  },
  "product_name": "jhula 80  |  جھولا 80",
  "product_category": "Uncategorized",
  "product_quantity": 4956,
  "retail_price": 3500,
  "wholesale_price": 2050,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:46:22.752Z"
  },
  "updatedAt": {
    "$date": "2026-01-31T13:43:11.485Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6863a0788b473901255961b9"
  },
  "product_name": "jhula 13  |  جھولا 13",
  "product_category": "Uncategorized",
  "product_quantity": 4982,
  "retail_price": 4000,
  "wholesale_price": 2500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:46:48.252Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:25:53.372Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6863a0a18b473901255961bd"
  },
  "product_name": "jhula 792  |  جھولا 092",
  "product_category": "Jhula",
  "product_quantity": 4988,
  "retail_price": 6500,
  "wholesale_price": 3850,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:47:29.294Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6863a1138b473901255961c1"
  },
  "product_name": "prime stroller 3 in 1 (6  small wheel)  |  پرائم اسٹرولر 3 ان 1 (6 چھوٹے وہیل)",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 7200,
  "wholesale_price": 5400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:49:23.374Z"
  },
  "updatedAt": {
    "$date": "2025-12-24T12:50:24.510Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6863a1738b473901255961c8"
  },
  "product_name": "prime stroller 3 in 1 ( 6 Big wheel)  |  پرائم اسٹرولر 3 ان 1 (6 بڑے وہیل)",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 7800,
  "wholesale_price": 6500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:50:59.935Z"
  },
  "updatedAt": {
    "$date": "2026-01-22T12:42:48.652Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6863a1ab8b473901255961cf"
  },
  "product_name": "prime stroller 2 in 1 (6  small wheel)  |  پرائم اسٹرولر 2 ان 1 (6 چھوٹے وہیل)",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 4800,
  "wholesale_price": 3800,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:51:55.374Z"
  },
  "updatedAt": {
    "$date": "2025-11-16T13:24:03.560Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "6863a34d8b473901255961d3"
  },
  "product_name": "walker wheel crystal small pin  |  واکر وہیل کرسٹل چھوٹی پِن",
  "product_category": "Uncategorized",
  "product_quantity": 4894,
  "retail_price": 90,
  "wholesale_price": 65,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-01T08:58:53.077Z"
  },
  "updatedAt": {
    "$date": "2026-01-11T13:50:02.253Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686d149ef769c2165d70edf4"
  },
  "product_name": "Taal jhula chawras",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 1400,
  "wholesale_price": 1080,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-08T12:52:46.787Z"
  },
  "updatedAt": {
    "$date": "2025-12-08T13:24:53.497Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686d2093f769c2165d70f255"
  },
  "product_name": "walker model 777",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 2000,
  "wholesale_price": 1600,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-08T13:43:47.092Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:44:17.814Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "686d2106f769c2165d70f259"
  },
  "product_name": "walker 555 (mama love)",
  "product_category": "Uncategorized",
  "product_quantity": 4902,
  "retail_price": 3500,
  "wholesale_price": 2200,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-08T13:45:42.507Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0,
  "costPrice": null
},
{
  "_id": {
    "$oid": "68749c421363d88cb68bf459"
  },
  "product_name": "care cut FA",
  "product_category": "Uncategorized",
  "product_quantity": 4969,
  "retail_price": 1500,
  "wholesale_price": 1260,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T05:57:22.603Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T14:12:25.410Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68749c671363d88cb68bf45d"
  },
  "product_name": "3 in 1 sitara vip",
  "product_category": "Uncategorized",
  "product_quantity": 4995,
  "retail_price": 2500,
  "wholesale_price": 2300,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T05:57:59.390Z"
  },
  "updatedAt": {
    "$date": "2025-11-29T13:05:18.699Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68749c9d1363d88cb68bf461"
  },
  "product_name": "walker china model best",
  "product_category": "Intex (Swimming Pool kids)",
  "product_quantity": 4974,
  "retail_price": 2500,
  "wholesale_price": 2200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T05:58:53.723Z"
  },
  "updatedAt": {
    "$date": "2026-01-20T10:44:36.886Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6874e7bc3ecd7bf8328f9ae2"
  },
  "product_name": "3 in 1 carry coat vip",
  "product_category": "Uncategorized",
  "product_quantity": 4977,
  "retail_price": 4000,
  "wholesale_price": 2300,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T11:19:24.455Z"
  },
  "updatedAt": {
    "$date": "2025-10-30T12:11:42.070Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6874e9ca3ecd7bf8328f9ae6"
  },
  "product_name": "walker 777 mama love",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 4000,
  "wholesale_price": 2300,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T11:28:10.020Z"
  },
  "updatedAt": {
    "$date": "2026-01-01T13:47:21.322Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6874ea363ecd7bf8328f9aea"
  },
  "product_name": "walker 777 FA hanger 10 wheel",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 2250,
  "wholesale_price": 1600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T11:29:58.869Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:42:37.264Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687520e53ecd7bf8328f9ebe"
  },
  "product_name": "chargeable Button",
  "product_category": "Uncategorized",
  "product_quantity": 4993,
  "retail_price": 500,
  "wholesale_price": 250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T15:23:17.664Z"
  },
  "updatedAt": {
    "$date": "2026-01-03T13:53:02.942Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687521103ecd7bf8328f9ec2"
  },
  "product_name": "three music",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 500,
  "wholesale_price": 100,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T15:24:00.552Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:42:02.555Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687524183ecd7bf8328fa049"
  },
  "product_name": "Tiger 16",
  "product_category": "Uncategorized",
  "product_quantity": 4954,
  "retail_price": 8000,
  "wholesale_price": 6350,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T15:36:56.241Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:16:34.866Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687524ea3ecd7bf8328fa04d"
  },
  "product_name": "medium pump swimming pool",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 1600,
  "wholesale_price": 1250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T15:40:26.466Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:41:35.865Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687525fc3ecd7bf8328fa051"
  },
  "product_name": "sony racer 20 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4993,
  "retail_price": 16500,
  "wholesale_price": 13800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T15:45:00.997Z"
  },
  "updatedAt": {
    "$date": "2025-10-27T07:32:03.484Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687526483ecd7bf8328fa055"
  },
  "product_name": "ys china special rim 20 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4961,
  "retail_price": 26000,
  "wholesale_price": 20500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-14T15:46:16.567Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6875eabf3ecd7bf8328fa4c1"
  },
  "product_name": "ys special rim 16",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 22000,
  "wholesale_price": 17500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-15T05:44:31.505Z"
  },
  "updatedAt": {
    "$date": "2025-10-05T14:05:32.320Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6875eb483ecd7bf8328fa4c5"
  },
  "product_name": "jeep bugy999 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4833,
  "retail_price": 2600,
  "wholesale_price": 1900,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-15T05:46:48.258Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:18:20.104Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6875ebb13ecd7bf8328fa4c9"
  },
  "product_name": "Road king sada 13",
  "product_category": "Uncategorized",
  "product_quantity": 4993,
  "retail_price": 6000,
  "wholesale_price": 4950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-15T05:48:33.630Z"
  },
  "updatedAt": {
    "$date": "2025-12-24T12:50:24.510Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6875ed583ecd7bf8328fa4ea"
  },
  "product_name": "philco bike 16",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 9500,
  "wholesale_price": 7000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-15T05:55:36.675Z"
  },
  "updatedAt": {
    "$date": "2025-09-10T12:18:21.251Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68762d6fc9192e7fea51ff3a"
  },
  "product_name": "SK 16 special (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4993,
  "retail_price": 26000,
  "wholesale_price": 18000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-15T10:29:03.347Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68764426c9192e7fea5203fc"
  },
  "product_name": "gt single hero",
  "product_category": "Uncategorized",
  "product_quantity": 4992,
  "retail_price": 2200,
  "wholesale_price": 1600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-15T12:05:58.995Z"
  },
  "updatedAt": {
    "$date": "2026-01-14T13:59:14.286Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68764448c9192e7fea520400"
  },
  "product_name": "gt single hero music",
  "product_category": "Uncategorized",
  "product_quantity": 4982,
  "retail_price": 2200,
  "wholesale_price": 1800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-15T12:06:32.343Z"
  },
  "updatedAt": {
    "$date": "2025-11-25T08:52:18.509Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68764472c9192e7fea520404"
  },
  "product_name": "dolphin 265",
  "product_category": "Uncategorized",
  "product_quantity": 4986,
  "retail_price": 4000,
  "wholesale_price": 2950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-15T12:07:14.119Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T14:00:12.929Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687644c8c9192e7fea520408"
  },
  "product_name": "jeep bugy 999",
  "product_category": "Uncategorized",
  "product_quantity": 4862,
  "retail_price": 2800,
  "wholesale_price": 1950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-15T12:08:40.884Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6877cb91c9192e7fea521439"
  },
  "product_name": "double rod double prince",
  "product_category": "Uncategorized",
  "product_quantity": 4957,
  "retail_price": 4000,
  "wholesale_price": 2850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-16T15:56:01.522Z"
  },
  "updatedAt": {
    "$date": "2025-10-27T08:26:34.728Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6877cbf8c9192e7fea52143d"
  },
  "product_name": "ranger hero",
  "product_category": "Uncategorized",
  "product_quantity": 4888,
  "retail_price": 3500,
  "wholesale_price": 2600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-16T15:57:44.244Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:46:00.066Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6877cd1fc9192e7fea521441"
  },
  "product_name": "jhula motti 5 rod nikel",
  "product_category": "Uncategorized",
  "product_quantity": 4985,
  "retail_price": 7500,
  "wholesale_price": 5050,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-16T16:02:39.692Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T12:35:56.620Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6877cdf2c9192e7fea521445"
  },
  "product_name": "Philco M225 12 inch",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 9500,
  "wholesale_price": 6950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-16T16:06:10.388Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:39:25.992Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687cef72c9192e7fea528086"
  },
  "product_name": "dolphin golden",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 4000,
  "wholesale_price": 2950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-20T13:30:26.817Z"
  },
  "updatedAt": {
    "$date": "2025-09-15T07:39:14.637Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687cf248c9192e7fea52829b"
  },
  "product_name": "SK 26 folding china",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 45000,
  "wholesale_price": 32500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-20T13:42:32.259Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T14:04:25.849Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687d025ec9192e7fea5284bf"
  },
  "product_name": "steering yellow cap",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 500,
  "wholesale_price": 250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-20T14:51:10.205Z"
  },
  "updatedAt": {
    "$date": "2025-10-21T13:49:35.863Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687f2d2dc9192e7fea529648"
  },
  "product_name": "sony galaxy mota tyre 20 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 22000,
  "wholesale_price": 16000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-22T06:18:21.374Z"
  },
  "updatedAt": {
    "$date": "2026-01-20T13:44:06.379Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "687f2d4ac9192e7fea52964c"
  },
  "product_name": "super shano star rim 20",
  "product_category": "Uncategorized",
  "product_quantity": 4988,
  "retail_price": 22000,
  "wholesale_price": 16000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-22T06:18:50.078Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:40:05.020Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "688222ff712402657f1d5bda"
  },
  "product_name": "super shano 20 gear",
  "product_category": "Uncategorized",
  "product_quantity": 5010,
  "retail_price": 20500,
  "wholesale_price": 15600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-24T12:11:43.568Z"
  },
  "updatedAt": {
    "$date": "2026-01-20T13:52:29.472Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "688223f2712402657f1d5bde"
  },
  "product_name": "sk   12 inch (mota tyre)",
  "product_category": "Uncategorized",
  "product_quantity": 5034,
  "retail_price": 16000,
  "wholesale_price": 12800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-24T12:15:46.539Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68822462712402657f1d5be2"
  },
  "product_name": "sk special rim carrier",
  "product_category": "Uncategorized",
  "product_quantity": 5007,
  "retail_price": 28000,
  "wholesale_price": 21500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-24T12:17:38.957Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T10:18:24.740Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "688224d9712402657f1d5be6"
  },
  "product_name": "jeep hunter",
  "product_category": "Uncategorized",
  "product_quantity": 4988,
  "retail_price": 4000,
  "wholesale_price": 2600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-24T12:19:37.606Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:24:11.925Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6882263a712402657f1d5bea"
  },
  "product_name": "sona super car bazu",
  "product_category": "Uncategorized",
  "product_quantity": 5013,
  "retail_price": 7000,
  "wholesale_price": 4200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-24T12:25:30.323Z"
  },
  "updatedAt": {
    "$date": "2025-12-20T13:41:57.336Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68822732712402657f1d5bee"
  },
  "product_name": "china happy single",
  "product_category": "Uncategorized",
  "product_quantity": 5005,
  "retail_price": 5500,
  "wholesale_price": 3650,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-24T12:29:38.359Z"
  },
  "updatedAt": {
    "$date": "2026-01-11T10:08:56.357Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68823e2c712402657f1d633c"
  },
  "product_name": "ys 26 special rim gear",
  "product_category": "Uncategorized",
  "product_quantity": 5013,
  "retail_price": 38000,
  "wholesale_price": 27500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-24T14:07:40.694Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T10:16:45.746Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68823eaa712402657f1d6340"
  },
  "product_name": "ys china special rim 20 inch (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5005,
  "retail_price": 28000,
  "wholesale_price": 19000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-24T14:09:46.905Z"
  },
  "updatedAt": {
    "$date": "2025-11-06T14:04:45.775Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68823f46712402657f1d6344"
  },
  "product_name": "chargeable jeep foam tyre",
  "product_category": "Uncategorized",
  "product_quantity": 5017,
  "retail_price": 45000,
  "wholesale_price": 29000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-24T14:12:22.369Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T10:13:55.787Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68823f7b712402657f1d6348"
  },
  "product_name": "swimming pool   2 ft (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5047,
  "retail_price": 1550,
  "wholesale_price": 950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-24T14:13:15.953Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T10:11:56.342Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68886e41712402657f1d8270"
  },
  "product_name": "jeep hunter (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 4000,
  "wholesale_price": 2500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-29T06:46:25.993Z"
  },
  "updatedAt": {
    "$date": "2025-10-14T10:52:19.888Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68886fdc712402657f1d8274"
  },
  "product_name": "YS mota tyre   20 inch (p)",
  "product_category": "Uncategorized",
  "product_quantity": 5020,
  "retail_price": 16000,
  "wholesale_price": 13800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-29T06:53:16.514Z"
  },
  "updatedAt": {
    "$date": "2026-01-04T09:34:09.629Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68887038712402657f1d8278"
  },
  "product_name": "force   18 inch (p)",
  "product_category": "Uncategorized",
  "product_quantity": 5046,
  "retail_price": 8500,
  "wholesale_price": 6700,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-29T06:54:48.600Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T10:09:28.116Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6888709e712402657f1d827c"
  },
  "product_name": "jeep stroller (malak) (p)",
  "product_category": "Uncategorized",
  "product_quantity": 5046,
  "retail_price": 4500,
  "wholesale_price": 2950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-07-29T06:56:30.909Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T11:18:28.062Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "688defe5712402657f1d9a70"
  },
  "product_name": "ajwa carry cut jalai",
  "product_category": "Uncategorized",
  "product_quantity": 4837,
  "retail_price": 1500,
  "wholesale_price": 950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-02T11:00:53.279Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "688df018712402657f1d9a74"
  },
  "product_name": "ajwa carry cut sada",
  "product_category": "Uncategorized",
  "product_quantity": 5035,
  "retail_price": 1300,
  "wholesale_price": 850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-02T11:01:44.782Z"
  },
  "updatedAt": {
    "$date": "2026-01-10T14:23:02.523Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "688f1e3b712402657f1da001"
  },
  "product_name": "Wheeling Cycle 20 inch",
  "product_category": "Uncategorized",
  "product_quantity": 5016,
  "retail_price": 18000,
  "wholesale_price": 13200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-03T08:30:51.153Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T10:07:23.776Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "688f1e81712402657f1da005"
  },
  "product_name": "New Power Cycle 16 inch",
  "product_category": "Uncategorized",
  "product_quantity": 5006,
  "retail_price": 18000,
  "wholesale_price": 12800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-03T08:32:01.502Z"
  },
  "updatedAt": {
    "$date": "2025-12-28T13:22:49.042Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "688f1f2b712402657f1da009"
  },
  "product_name": "malak double nicel jalai",
  "product_category": "Uncategorized",
  "product_quantity": 5910,
  "retail_price": 3500,
  "wholesale_price": 2250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-03T08:34:51.732Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "688f1fd6712402657f1da00d"
  },
  "product_name": "philco new 2 wheeler 2025",
  "product_category": "Uncategorized",
  "product_quantity": 4828,
  "retail_price": 9500,
  "wholesale_price": 7000,
  "costPrice": 6350,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-03T08:37:42.803Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68908492712402657f1db70a"
  },
  "product_name": "china sk carrier 20 inch",
  "product_category": "Uncategorized",
  "product_quantity": 5017,
  "retail_price": 28000,
  "wholesale_price": 21500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-04T09:59:46.835Z"
  },
  "updatedAt": {
    "$date": "2025-10-11T13:52:10.813Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6890b1b8712402657f1dba28"
  },
  "product_name": "MCO jhula 1 inch",
  "product_category": "Uncategorized",
  "product_quantity": 5039,
  "retail_price": 9000,
  "wholesale_price": 5850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-04T13:12:24.772Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T12:35:56.620Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6890b2b7712402657f1dba2c"
  },
  "product_name": "gora seat music",
  "product_category": "Uncategorized",
  "product_quantity": 4975,
  "retail_price": 1200,
  "wholesale_price": 840,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-04T13:16:39.997Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:03:00.627Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6891c17c712402657f1dc342"
  },
  "product_name": "jhula white cotton",
  "product_category": "Uncategorized",
  "product_quantity": 5049,
  "retail_price": 6500,
  "wholesale_price": 4600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-05T08:31:56.617Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:34:52.662Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6891c20b712402657f1dc349"
  },
  "product_name": "Prime stroller 3 in 1 (8 wheel)",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 15500,
  "wholesale_price": 9500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-05T08:34:19.939Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:33:24.056Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6891c267712402657f1dc34d"
  },
  "product_name": "walker super 3 in 1 karachi",
  "product_category": "Uncategorized",
  "product_quantity": 5009,
  "retail_price": 6000,
  "wholesale_price": 3400,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-05T08:35:51.681Z"
  },
  "updatedAt": {
    "$date": "2026-01-10T14:17:31.862Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6891c313712402657f1dc351"
  },
  "product_name": "mastela 3 in 1 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5014,
  "retail_price": 18500,
  "wholesale_price": 14500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-05T08:38:43.673Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:25:53.372Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6891c347712402657f1dc355"
  },
  "product_name": "707 car",
  "product_category": "Uncategorized",
  "product_quantity": 4979,
  "retail_price": 3500,
  "wholesale_price": 2550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-05T08:39:35.499Z"
  },
  "updatedAt": {
    "$date": "2026-01-04T13:20:06.668Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6891c412712402657f1dc359"
  },
  "product_name": "1260 chargeable bike",
  "product_category": "Uncategorized",
  "product_quantity": 5009,
  "retail_price": 45000,
  "wholesale_price": 31500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-05T08:42:58.385Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:36:57.615Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6891c727712402657f1dc6aa"
  },
  "product_name": "sk vip special rim",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 28000,
  "wholesale_price": 20500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-05T08:56:07.914Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6891cffe712402657f1dcd20"
  },
  "product_name": "pot mama love",
  "product_category": "Uncategorized",
  "product_quantity": 5044,
  "retail_price": 1600,
  "wholesale_price": 1250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-05T09:33:50.478Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:37:17.273Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68936d88712402657f1df12a"
  },
  "product_name": "power 20 inch",
  "product_category": "Uncategorized",
  "product_quantity": 5001,
  "retail_price": 20500,
  "wholesale_price": 13600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-06T14:58:16.043Z"
  },
  "updatedAt": {
    "$date": "2025-10-29T13:05:39.130Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68936dd6712402657f1df12e"
  },
  "product_name": "maxes golden",
  "product_category": "Uncategorized",
  "product_quantity": 5028,
  "retail_price": 5500,
  "wholesale_price": 3250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-06T14:59:34.434Z"
  },
  "updatedAt": {
    "$date": "2025-11-04T13:02:05.747Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68937b72712402657f1e03a0"
  },
  "product_name": "sk special 16",
  "product_category": "Uncategorized",
  "product_quantity": 5093,
  "retail_price": 23500,
  "wholesale_price": 17800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-06T15:57:38.492Z"
  },
  "updatedAt": {
    "$date": "2025-12-01T13:19:15.493Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68937d47712402657f1e0769"
  },
  "product_name": "car mickey mouse (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4951,
  "retail_price": 2000,
  "wholesale_price": 1400,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-06T16:05:27.357Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:22:43.596Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68937d6b712402657f1e0770"
  },
  "product_name": "yellow cap (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4984,
  "retail_price": 4500,
  "wholesale_price": 3100,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-06T16:06:03.137Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:18:58.776Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68937d8f712402657f1e0774"
  },
  "product_name": "diamond single lucky (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 2500,
  "wholesale_price": 1650,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-06T16:06:39.089Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:15:51.454Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894a033712402657f1e2191"
  },
  "product_name": "Diamond double vip (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5016,
  "retail_price": 4500,
  "wholesale_price": 2750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T12:46:43.224Z"
  },
  "updatedAt": {
    "$date": "2025-10-09T13:00:12.888Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894a09f712402657f1e2195"
  },
  "product_name": "titan stroller 3 wheeler (p)",
  "product_category": "Uncategorized",
  "product_quantity": 5015,
  "retail_price": 6500,
  "wholesale_price": 4300,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T12:48:31.028Z"
  },
  "updatedAt": {
    "$date": "2025-10-13T13:47:52.939Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894ae0b712402657f1e29a5"
  },
  "product_name": "foxcy double foam",
  "product_category": "Uncategorized",
  "product_quantity": 5029,
  "retail_price": 4000,
  "wholesale_price": 2950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T13:45:47.192Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:32:46.035Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894ae39712402657f1e29a9"
  },
  "product_name": "shahbaz single foam tyre",
  "product_category": "Uncategorized",
  "product_quantity": 5029,
  "retail_price": 4000,
  "wholesale_price": 3150,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T13:46:33.479Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:32:06.783Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894bb81712402657f1e31d6"
  },
  "product_name": "minion (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5026,
  "retail_price": 6000,
  "wholesale_price": 3950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T14:43:13.470Z"
  },
  "updatedAt": {
    "$date": "2025-12-31T13:12:56.680Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894bb9f712402657f1e31da"
  },
  "product_name": "601 dolphin (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5013,
  "retail_price": 4500,
  "wholesale_price": 3100,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T14:43:43.056Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T12:35:56.620Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894bbc1712402657f1e31de"
  },
  "product_name": "chawras lucky (m)",
  "product_category": "Uncategorized",
  "product_quantity": 49724,
  "retail_price": 1800,
  "wholesale_price": 1260,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T14:44:17.980Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:16:34.866Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894bbdf712402657f1e31e2"
  },
  "product_name": "M240 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5068,
  "retail_price": 7800,
  "wholesale_price": 6000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T14:44:47.036Z"
  },
  "updatedAt": {
    "$date": "2026-01-17T13:54:15.447Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894bc1e712402657f1e31e6"
  },
  "product_name": "Chargeable jeep 824 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5018,
  "retail_price": 32000,
  "wholesale_price": 21500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T14:45:50.159Z"
  },
  "updatedAt": {
    "$date": "2025-11-25T12:55:55.950Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894bd02712402657f1e31ea"
  },
  "product_name": "M240 (p)",
  "product_category": "Uncategorized",
  "product_quantity": 5021,
  "retail_price": 7800,
  "wholesale_price": 6100,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T14:49:38.158Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:49:48.929Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894bd37712402657f1e31ee"
  },
  "product_name": "M2020 (m) 16 inch foam",
  "product_category": "Uncategorized",
  "product_quantity": 5020,
  "retail_price": 10500,
  "wholesale_price": 8000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T14:50:31.571Z"
  },
  "updatedAt": {
    "$date": "2026-01-29T14:09:50.236Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894c09e712402657f1e31f5"
  },
  "product_name": "614 stroller (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5044,
  "retail_price": 4800,
  "wholesale_price": 3750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T15:05:02.894Z"
  },
  "updatedAt": {
    "$date": "2025-09-25T12:48:30.277Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894c1dc712402657f1e31f9"
  },
  "product_name": "Double vip chawras (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5038,
  "retail_price": 4500,
  "wholesale_price": 3000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T15:10:20.051Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:29:11.566Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894c258712402657f1e31fd"
  },
  "product_name": "ajwa walker (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4946,
  "retail_price": 1100,
  "wholesale_price": 880,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T15:12:24.579Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T13:51:28.063Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894c347712402657f1e363b"
  },
  "product_name": "Balance",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 6000,
  "wholesale_price": 5000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T15:16:23.281Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:27:58.628Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894c46a712402657f1e3642"
  },
  "product_name": "Walker 3 in 1 karachi (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5012,
  "retail_price": 5500,
  "wholesale_price": 3300,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T15:21:14.299Z"
  },
  "updatedAt": {
    "$date": "2025-10-25T09:39:34.179Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894c4ae712402657f1e3646"
  },
  "product_name": "Jeep Mco Stroller 907 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5046,
  "retail_price": 5500,
  "wholesale_price": 3400,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T15:22:22.866Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6894c5ed712402657f1e364a"
  },
  "product_name": "Sonic malak",
  "product_category": "Uncategorized",
  "product_quantity": 5003,
  "retail_price": 5500,
  "wholesale_price": 3250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-07T15:27:41.385Z"
  },
  "updatedAt": {
    "$date": "2026-01-11T10:08:56.357Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6896f1cc712402657f1e46ce"
  },
  "product_name": "D 5 double",
  "product_category": "Uncategorized",
  "product_quantity": 5038,
  "retail_price": 2500,
  "wholesale_price": 1950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-09T06:59:24.904Z"
  },
  "updatedAt": {
    "$date": "2025-10-16T12:40:31.543Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68976197712402657f1e4f24"
  },
  "product_name": "chargeable model 1900 (p)",
  "product_category": "Uncategorized",
  "product_quantity": 5032,
  "retail_price": 24000,
  "wholesale_price": 18000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-09T14:56:23.906Z"
  },
  "updatedAt": {
    "$date": "2026-01-18T05:56:24.410Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6897620e712402657f1e4f28"
  },
  "product_name": "Chargeable jeep 824 (p)",
  "product_category": "Uncategorized",
  "product_quantity": 5035,
  "retail_price": 32000,
  "wholesale_price": 22500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-09T14:58:22.963Z"
  },
  "updatedAt": {
    "$date": "2025-09-28T14:44:31.201Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68983213712402657f1e6e2e"
  },
  "product_name": "Wheel model 801",
  "product_category": "Uncategorized",
  "product_quantity": 5019,
  "retail_price": 1800,
  "wholesale_price": 1450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-10T05:45:55.330Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:26:04.866Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689a0f01712402657f1eb55f"
  },
  "product_name": "walker sitara stroller",
  "product_category": "Uncategorized",
  "product_quantity": 5012,
  "retail_price": 5000,
  "wholesale_price": 3200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-11T15:40:49.046Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689b4364712402657f1ed2c0"
  },
  "product_name": "spiderman",
  "product_category": "Uncategorized",
  "product_quantity": 5132,
  "retail_price": 4000,
  "wholesale_price": 2800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-12T13:36:36.490Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:49:48.929Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689b45cb712402657f1ed2cb"
  },
  "product_name": "chargeable bike",
  "product_category": "Uncategorized",
  "product_quantity": 5002,
  "retail_price": 22000,
  "wholesale_price": 15800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-12T13:46:51.781Z"
  },
  "updatedAt": {
    "$date": "2025-10-29T07:34:54.077Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689b46a1712402657f1ed2cf"
  },
  "product_name": "jhula minar 5 rod",
  "product_category": "Uncategorized",
  "product_quantity": 5028,
  "retail_price": 12000,
  "wholesale_price": 7800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-12T13:50:25.618Z"
  },
  "updatedAt": {
    "$date": "2025-10-01T07:41:50.617Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689b47c7712402657f1ed2d3"
  },
  "product_name": "china 16 caspian",
  "product_category": "Uncategorized",
  "product_quantity": 5014,
  "retail_price": 20500,
  "wholesale_price": 15500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-12T13:55:19.156Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:21:21.612Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689b5b8c712402657f1ee23e"
  },
  "product_name": "walker stroller chat baby world",
  "product_category": "Uncategorized",
  "product_quantity": 5026,
  "retail_price": 4500,
  "wholesale_price": 3050,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-12T15:19:40.725Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:15:51.454Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689b5bde712402657f1ee245"
  },
  "product_name": "walker stroller baby world",
  "product_category": "Uncategorized",
  "product_quantity": 5028,
  "retail_price": 3500,
  "wholesale_price": 2250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-12T15:21:02.406Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:17:55.928Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689b5faa712402657f1ee786"
  },
  "product_name": "chargeable model 1900 (m) |  چارج ایبل ماڈل 1900",
  "product_category": "Uncategorized",
  "product_quantity": 5028,
  "retail_price": 24500,
  "wholesale_price": 17000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-12T15:37:14.071Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:17:42.479Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689b60b3712402657f1ee78a"
  },
  "product_name": "sony racer 20 inch (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 16500,
  "wholesale_price": 13600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-12T15:41:39.083Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689b610f712402657f1ee78e"
  },
  "product_name": "stroller gora 705",
  "product_category": "Uncategorized",
  "product_quantity": 5043,
  "retail_price": 5500,
  "wholesale_price": 3950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-12T15:43:11.216Z"
  },
  "updatedAt": {
    "$date": "2025-12-21T10:27:31.408Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689ca8f8712402657f1ef791"
  },
  "product_name": "ajwa car (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5034,
  "retail_price": 1600,
  "wholesale_price": 1150,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-13T15:02:16.349Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:24:11.925Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689e0548712402657f1f3374"
  },
  "product_name": "bill no 84",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 1,
  "wholesale_price": 174020,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-14T15:48:24.177Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:16:23.416Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689e06d5712402657f1f3936"
  },
  "product_name": "Jet pro Double (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5017,
  "retail_price": 5500,
  "wholesale_price": 3450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-14T15:55:01.096Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T13:40:20.426Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689e0767712402657f1f3941"
  },
  "product_name": "chicago double (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4725,
  "retail_price": 2200,
  "wholesale_price": 1700,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-14T15:57:27.724Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.847Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689e08c6712402657f1f394e"
  },
  "product_name": "ben 10 top rider",
  "product_category": "Uncategorized",
  "product_quantity": 5799,
  "retail_price": 4400,
  "wholesale_price": 3500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-14T16:03:18.630Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "689e09c7712402657f1f3955"
  },
  "product_name": "panda single (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5043,
  "retail_price": 2500,
  "wholesale_price": 1700,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-14T16:07:35.178Z"
  },
  "updatedAt": {
    "$date": "2025-09-10T12:24:37.331Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a2c728712402657f1f44c3"
  },
  "product_name": "chargeable jeep 1902",
  "product_category": "Uncategorized",
  "product_quantity": 4995,
  "retail_price": 28000,
  "wholesale_price": 20000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-18T06:24:40.491Z"
  },
  "updatedAt": {
    "$date": "2025-09-27T14:47:57.282Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a2c759712402657f1f44c7"
  },
  "product_name": "chargeable jeep 802",
  "product_category": "Uncategorized",
  "product_quantity": 5006,
  "retail_price": 28000,
  "wholesale_price": 22500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-18T06:25:29.581Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:12:59.233Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a2c7a4712402657f1f44ce"
  },
  "product_name": "happy tiger 1 inch",
  "product_category": "Uncategorized",
  "product_quantity": 5002,
  "retail_price": 4800,
  "wholesale_price": 3450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-18T06:26:44.654Z"
  },
  "updatedAt": {
    "$date": "2026-01-11T10:08:56.357Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a2c879712402657f1f44d2"
  },
  "product_name": "Bill no 97",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 1,
  "wholesale_price": 519680,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-18T06:30:17.611Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:12:11.825Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a33d1c712402657f1f6105"
  },
  "product_name": "3 in 1 panda karachi",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 5500,
  "wholesale_price": 3550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-18T14:47:56.416Z"
  },
  "updatedAt": {
    "$date": "2026-01-18T13:37:17.595Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a34386712402657f1f7e39"
  },
  "product_name": "Double vip gol 004",
  "product_category": "Uncategorized",
  "product_quantity": 5024,
  "retail_price": 4500,
  "wholesale_price": 3150,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-18T15:15:18.079Z"
  },
  "updatedAt": {
    "$date": "2025-11-23T14:02:34.972Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a34484712402657f1f7e3d"
  },
  "product_name": "Taal jhula double spring cloth",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 1450,
  "wholesale_price": 1010,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-18T15:19:32.702Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:05:44.977Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a43de9712402657f1f901e"
  },
  "product_name": "sona super mini speed",
  "product_category": "Uncategorized",
  "product_quantity": 5028,
  "retail_price": 7000,
  "wholesale_price": 5200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-19T09:03:37.295Z"
  },
  "updatedAt": {
    "$date": "2026-01-20T13:55:03.166Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a495b0712402657f1fb718"
  },
  "product_name": "walker wheel simple small pin",
  "product_category": "Uncategorized",
  "product_quantity": 4770,
  "retail_price": 70,
  "wholesale_price": 45,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-19T15:18:08.694Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a4986f712402657f1fca44"
  },
  "product_name": "Sezo Single Cycle (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4938,
  "retail_price": 2200,
  "wholesale_price": 1560,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-19T15:29:51.533Z"
  },
  "updatedAt": {
    "$date": "2026-01-20T13:56:18.762Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a49977712402657f1fca48"
  },
  "product_name": "new remaining bill",
  "product_category": "Uncategorized",
  "product_quantity": 4988,
  "retail_price": 1,
  "wholesale_price": 24600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-19T15:34:15.776Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T14:20:27.324Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a5a3a7712402657f1ff200"
  },
  "product_name": "walker foxcy karachi",
  "product_category": "Uncategorized",
  "product_quantity": 5016,
  "retail_price": 5000,
  "wholesale_price": 3300,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-20T10:29:59.332Z"
  },
  "updatedAt": {
    "$date": "2025-10-13T14:01:10.431Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a5e307712402657f1fff59"
  },
  "product_name": "Prime stroller 3 in 1 full size",
  "product_category": "Uncategorized",
  "product_quantity": 5009,
  "retail_price": 15500,
  "wholesale_price": 11200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-20T15:00:23.681Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:09:18.736Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a5e35f712402657f1fff5d"
  },
  "product_name": "supari billi moon",
  "product_category": "Uncategorized",
  "product_quantity": 5039,
  "retail_price": 2200,
  "wholesale_price": 1650,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-20T15:01:51.362Z"
  },
  "updatedAt": {
    "$date": "2026-01-05T13:28:31.546Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a5e3fc712402657f1fff61"
  },
  "product_name": "chargeable model 1900 paint",
  "product_category": "Uncategorized",
  "product_quantity": 5023,
  "retail_price": 25000,
  "wholesale_price": 19000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-20T15:04:28.241Z"
  },
  "updatedAt": {
    "$date": "2025-12-31T13:36:30.850Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a5eb4d712402657f201ab9"
  },
  "product_name": "jhula 80 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5036,
  "retail_price": 3500,
  "wholesale_price": 1850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-20T15:35:41.454Z"
  },
  "updatedAt": {
    "$date": "2025-11-25T07:33:38.847Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68a96f50712402657f2058da"
  },
  "product_name": "New malak cycle",
  "product_category": "Uncategorized",
  "product_quantity": 5018,
  "retail_price": 2200,
  "wholesale_price": 1400,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-23T07:35:44.417Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:07:48.424Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68aa9da8712402657f208b27"
  },
  "product_name": "titan double (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4944,
  "retail_price": 6500,
  "wholesale_price": 4600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-24T05:05:44.289Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68aa9f16712402657f208b2b"
  },
  "product_name": "28 jeep chargeable",
  "product_category": "Uncategorized",
  "product_quantity": 4893,
  "retail_price": 38000,
  "wholesale_price": 26500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-24T05:11:50.264Z"
  },
  "updatedAt": {
    "$date": "2026-01-10T14:17:31.862Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68aac02c712402657f20b8c7"
  },
  "product_name": "sona car speed racer bazu",
  "product_category": "Uncategorized",
  "product_quantity": 4920,
  "retail_price": 9000,
  "wholesale_price": 6400,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-24T07:33:00.464Z"
  },
  "updatedAt": {
    "$date": "2026-01-17T13:54:15.447Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68aad8bd712402657f20c84d"
  },
  "product_name": "707 walker karachi",
  "product_category": "Uncategorized",
  "product_quantity": 4915,
  "retail_price": 4500,
  "wholesale_price": 2850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-24T09:17:49.318Z"
  },
  "updatedAt": {
    "$date": "2025-12-27T13:40:36.546Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68aad8ee712402657f20c851"
  },
  "product_name": "Foxcy 404 walker",
  "product_category": "Uncategorized",
  "product_quantity": 4977,
  "retail_price": 5500,
  "wholesale_price": 3250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-24T09:18:38.826Z"
  },
  "updatedAt": {
    "$date": "2025-12-21T13:28:43.878Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68aad959712402657f20c855"
  },
  "product_name": "small pot mama love",
  "product_category": "Uncategorized",
  "product_quantity": 4932,
  "retail_price": 700,
  "wholesale_price": 450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-24T09:20:25.936Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:06:01.746Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ab27c1712402657f20d78b"
  },
  "product_name": "20 china royal special rim",
  "product_category": "Uncategorized",
  "product_quantity": 4911,
  "retail_price": 26000,
  "wholesale_price": 20100,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-24T14:54:57.423Z"
  },
  "updatedAt": {
    "$date": "2026-01-04T13:25:48.915Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ab2966712402657f20df5e"
  },
  "product_name": "16 china super sk special rim",
  "product_category": "Uncategorized",
  "product_quantity": 4879,
  "retail_price": 25000,
  "wholesale_price": 18500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-24T15:01:58.991Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ab2dc1712402657f20e74b"
  },
  "product_name": "Sezo single gol",
  "product_category": "Uncategorized",
  "product_quantity": 4915,
  "retail_price": 2200,
  "wholesale_price": 1600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-24T15:20:33.312Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:33:03.397Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ab34d1712402657f20f761"
  },
  "product_name": "24 special rim",
  "product_category": "Uncategorized",
  "product_quantity": 4993,
  "retail_price": 35000,
  "wholesale_price": 24800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-24T15:50:41.714Z"
  },
  "updatedAt": {
    "$date": "2025-10-27T07:32:03.484Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ac3797712402657f2131e7"
  },
  "product_name": "chargeable 615",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 30000,
  "wholesale_price": 21000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-25T10:14:47.240Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:04:49.556Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ac3ab4712402657f2131eb"
  },
  "product_name": "duck malak cycle",
  "product_category": "Uncategorized",
  "product_quantity": 4983,
  "retail_price": 3500,
  "wholesale_price": 2300,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-25T10:28:04.956Z"
  },
  "updatedAt": {
    "$date": "2026-01-18T08:35:11.162Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ac7b09712402657f217ce6"
  },
  "product_name": "Ys 24 gear spcial rim",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 38000,
  "wholesale_price": 27500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-25T15:02:33.787Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:04:07.060Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ac7e25712402657f217cea"
  },
  "product_name": "Vip Wheel Front",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 700,
  "wholesale_price": 480,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-25T15:15:49.743Z"
  },
  "updatedAt": {
    "$date": "2025-12-09T10:23:22.058Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ac8220712402657f218e36"
  },
  "product_name": "18 china royal special rim",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 25000,
  "wholesale_price": 18000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-25T15:32:48.716Z"
  },
  "updatedAt": {
    "$date": "2026-01-29T14:09:50.236Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68adcd65712402657f21ef73"
  },
  "product_name": "chargeable jeep 401",
  "product_category": "Uncategorized",
  "product_quantity": 4992,
  "retail_price": 42000,
  "wholesale_price": 33800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-26T15:06:13.428Z"
  },
  "updatedAt": {
    "$date": "2025-11-09T06:28:14.901Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68adcddd712402657f21ef77"
  },
  "product_name": "china 20 caspian alumn rim",
  "product_category": "Uncategorized",
  "product_quantity": 4993,
  "retail_price": 23000,
  "wholesale_price": 17500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-26T15:08:13.944Z"
  },
  "updatedAt": {
    "$date": "2025-10-18T05:22:04.926Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68add1c7712402657f2225b7"
  },
  "product_name": "F16 dolphin",
  "product_category": "Uncategorized",
  "product_quantity": 4989,
  "retail_price": 3500,
  "wholesale_price": 2950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-26T15:24:55.212Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:48:37.854Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68add4b1712402657f22381a"
  },
  "product_name": "Power sports 20",
  "product_category": "Uncategorized",
  "product_quantity": 4994,
  "retail_price": 16500,
  "wholesale_price": 13800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-26T15:37:21.153Z"
  },
  "updatedAt": {
    "$date": "2025-10-06T14:14:31.289Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68add60a712402657f22381e"
  },
  "product_name": "carry cut black vip",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 2500,
  "wholesale_price": 1650,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-26T15:43:06.549Z"
  },
  "updatedAt": {
    "$date": "2025-11-19T13:55:26.018Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68af1acf712402657f229601"
  },
  "product_name": "Duck mco 722",
  "product_category": "Uncategorized",
  "product_quantity": 4967,
  "retail_price": 3800,
  "wholesale_price": 2750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-27T14:48:47.942Z"
  },
  "updatedAt": {
    "$date": "2025-09-20T14:52:12.261Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b0681c712402657f22bd56"
  },
  "product_name": "sonic (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4954,
  "retail_price": 4200,
  "wholesale_price": 2900,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-28T14:30:52.979Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:22:43.596Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b06a2e712402657f22bd60"
  },
  "product_name": "3 in 1 panda karachi (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 5500,
  "wholesale_price": 3450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-28T14:39:42.365Z"
  },
  "updatedAt": {
    "$date": "2025-09-09T08:02:02.642Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b06d10712402657f22bd67"
  },
  "product_name": "master car dhoom (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4252,
  "retail_price": 1300,
  "wholesale_price": 900,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-28T14:52:00.449Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T12:35:56.620Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b06d48712402657f22bd6b"
  },
  "product_name": "Taal jhula golden",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 9500,
  "wholesale_price": 7200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-28T14:52:56.781Z"
  },
  "updatedAt": {
    "$date": "2025-11-03T13:37:59.752Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b44e80712402657f230401"
  },
  "product_name": "jhula nickel chunghee",
  "product_category": "Uncategorized",
  "product_quantity": 4961,
  "retail_price": 5500,
  "wholesale_price": 3850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-08-31T13:30:40.038Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b55cbc712402657f23569e"
  },
  "product_name": "charger",
  "product_category": "Uncategorized",
  "product_quantity": 4184,
  "retail_price": 1200,
  "wholesale_price": 900,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-01T08:43:40.346Z"
  },
  "updatedAt": {
    "$date": "2025-12-21T12:53:41.029Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b55de9712402657f2356a2"
  },
  "product_name": "20 china royal gear special rim",
  "product_category": "Uncategorized",
  "product_quantity": 4914,
  "retail_price": 32000,
  "wholesale_price": 24800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-01T08:48:41.038Z"
  },
  "updatedAt": {
    "$date": "2025-10-27T07:32:03.484Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b56a90712402657f2397b5"
  },
  "product_name": "wheel foam",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 600,
  "wholesale_price": 480,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-01T09:42:40.095Z"
  },
  "updatedAt": {
    "$date": "2025-12-16T12:29:50.218Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b7fe2e712402657f2437ba"
  },
  "product_name": "crystal walker karachi 10 wheel",
  "product_category": "Uncategorized",
  "product_quantity": 4986,
  "retail_price": 4500,
  "wholesale_price": 2750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-03T08:37:02.560Z"
  },
  "updatedAt": {
    "$date": "2025-10-28T09:14:15.619Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b851be712402657f247044"
  },
  "product_name": "super shano gear 24",
  "product_category": "Uncategorized",
  "product_quantity": 4989,
  "retail_price": 23000,
  "wholesale_price": 17600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-03T14:33:34.384Z"
  },
  "updatedAt": {
    "$date": "2026-01-13T13:13:15.137Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b85348712402657f247b70"
  },
  "product_name": "chota gora",
  "product_category": "Uncategorized",
  "product_quantity": 4981,
  "retail_price": 550,
  "wholesale_price": 460,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-03T14:40:08.904Z"
  },
  "updatedAt": {
    "$date": "2026-01-18T13:38:48.703Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b982e0712402657f24ed87"
  },
  "product_name": "chargeable 615 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4992,
  "retail_price": 30000,
  "wholesale_price": 20500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-04T12:15:28.115Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:07:53.173Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b9a4cc712402657f24f969"
  },
  "product_name": "car malak 401",
  "product_category": "Uncategorized",
  "product_quantity": 4948,
  "retail_price": 2200,
  "wholesale_price": 1550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-04T14:40:12.354Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:20:47.421Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68b9a775712402657f24f96d"
  },
  "product_name": "foam chargeable bike",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 42000,
  "wholesale_price": 28500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-04T14:51:33.049Z"
  },
  "updatedAt": {
    "$date": "2025-09-10T12:24:37.331Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68bc45d9712402657f2593bd"
  },
  "product_name": "single gol vip 003",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 3800,
  "wholesale_price": 2800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-06T14:31:53.909Z"
  },
  "updatedAt": {
    "$date": "2025-11-29T13:37:13.286Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68bd6e0b712402657f265b90"
  },
  "product_name": "ben 10 m 25 philco",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 4800,
  "wholesale_price": 3550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-07T11:35:39.165Z"
  },
  "updatedAt": {
    "$date": "2025-09-07T11:41:44.732Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68bd6e33712402657f265b94"
  },
  "product_name": "simsim foam simple 12",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 6000,
  "wholesale_price": 4850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-07T11:36:19.254Z"
  },
  "updatedAt": {
    "$date": "2025-10-01T14:44:02.393Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68bea7e8712402657f26c2a7"
  },
  "product_name": "philco m25 10 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 4800,
  "wholesale_price": 3550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-08T09:54:48.880Z"
  },
  "updatedAt": {
    "$date": "2025-09-08T11:19:57.414Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68beb1f6712402657f26f6e0"
  },
  "product_name": "sumic 26 mota tyre",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 28500,
  "wholesale_price": 20500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-08T10:37:42.452Z"
  },
  "updatedAt": {
    "$date": "2025-09-08T11:19:57.414Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68beb236712402657f26f6e4"
  },
  "product_name": "911 police jeep 4x4",
  "product_category": "Uncategorized",
  "product_quantity": 4994,
  "retail_price": 38000,
  "wholesale_price": 27500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-08T10:38:46.075Z"
  },
  "updatedAt": {
    "$date": "2025-12-28T13:41:59.203Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68beba2c712402657f26f6e8"
  },
  "product_name": "jhula MJ 208",
  "product_category": "Uncategorized",
  "product_quantity": 4975,
  "retail_price": 6500,
  "wholesale_price": 4600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-08T11:12:44.585Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:25:53.372Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68bebaf0712402657f26f6ec"
  },
  "product_name": "jhula chunghee mota pipe",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 5500,
  "wholesale_price": 3800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-08T11:16:00.742Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T14:12:25.410Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68bee339712402657f273896"
  },
  "product_name": "Malak single",
  "product_category": "Uncategorized",
  "product_quantity": 4993,
  "retail_price": 2500,
  "wholesale_price": 1950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-08T14:07:53.199Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68beec7d712402657f27605f"
  },
  "product_name": "stroller cycle",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 15500,
  "wholesale_price": 10500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-08T14:47:25.288Z"
  },
  "updatedAt": {
    "$date": "2025-09-08T15:00:16.654Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68c12011712402657f28ebdc"
  },
  "product_name": "be good   26 inch (gear) M",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 35000,
  "wholesale_price": 26500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-10T06:52:01.243Z"
  },
  "updatedAt": {
    "$date": "2025-09-10T06:53:28.886Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68c16da1712402657f2915a6"
  },
  "product_name": "jeep 6188 chargeable",
  "product_category": "Uncategorized",
  "product_quantity": 4988,
  "retail_price": 55000,
  "wholesale_price": 40500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-10T12:22:57.888Z"
  },
  "updatedAt": {
    "$date": "2025-11-22T07:35:57.315Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68c18cf0712402657f29cc43"
  },
  "product_name": "car sitara 601",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 2500,
  "wholesale_price": 1900,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-10T14:36:32.206Z"
  },
  "updatedAt": {
    "$date": "2025-09-10T14:38:52.030Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68c96d1e712402657f2cf636"
  },
  "product_name": "super shano simple 24",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 21000,
  "wholesale_price": 15800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-16T13:58:54.825Z"
  },
  "updatedAt": {
    "$date": "2025-11-27T12:56:58.828Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ca5e88712402657f2d9806"
  },
  "product_name": "26 inch stone bike gear special",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 42000,
  "wholesale_price": 29500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-17T07:08:56.673Z"
  },
  "updatedAt": {
    "$date": "2025-12-22T13:19:03.395Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ca5eac712402657f2d980a"
  },
  "product_name": "24 inch stone bike gear special",
  "product_category": "Uncategorized",
  "product_quantity": 4990,
  "retail_price": 40000,
  "wholesale_price": 28500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-17T07:09:32.093Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:33:03.397Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68cac7be712402657f2dd9e6"
  },
  "product_name": "Ys 3 bar double chimta",
  "product_category": "Uncategorized",
  "product_quantity": 4984,
  "retail_price": 15500,
  "wholesale_price": 12800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-17T14:37:50.354Z"
  },
  "updatedAt": {
    "$date": "2025-09-29T07:06:16.888Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68cacffd712402657f2e3d82"
  },
  "product_name": "403   R-1 bike (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4985,
  "retail_price": 24500,
  "wholesale_price": 21000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-17T15:13:01.832Z"
  },
  "updatedAt": {
    "$date": "2026-01-18T13:37:17.595Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68cebf2b712402657f2f4b42"
  },
  "product_name": "Chargeable jeep china Big",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 85000,
  "wholesale_price": 64000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-20T14:50:19.654Z"
  },
  "updatedAt": {
    "$date": "2025-09-20T14:52:12.261Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68cf93ee712402657f2fb259"
  },
  "product_name": "karachi prime Stroller",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 6500,
  "wholesale_price": 4800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-21T05:58:06.484Z"
  },
  "updatedAt": {
    "$date": "2025-09-21T05:58:06.484Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d10e5d712402657f30dd41"
  },
  "product_name": "Moon single foam",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 3500,
  "wholesale_price": 2200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-22T08:52:45.733Z"
  },
  "updatedAt": {
    "$date": "2025-12-08T13:28:34.406Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d1112f712402657f30dd45"
  },
  "product_name": "jhula 792 (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4992,
  "retail_price": 6500,
  "wholesale_price": 3950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-22T09:04:47.881Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T14:10:57.852Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d13946712402657f310189"
  },
  "product_name": "carry coat jumbo king",
  "product_category": "Uncategorized",
  "product_quantity": 4989,
  "retail_price": 4000,
  "wholesale_price": 2350,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-22T11:55:50.667Z"
  },
  "updatedAt": {
    "$date": "2026-01-17T14:38:10.029Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d1561e712402657f316dd5"
  },
  "product_name": "D single reliable",
  "product_category": "Uncategorized",
  "product_quantity": 4944,
  "retail_price": 2000,
  "wholesale_price": 1480,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-22T13:58:54.192Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:16:34.866Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d15646712402657f316dd9"
  },
  "product_name": "D double reliable",
  "product_category": "Uncategorized",
  "product_quantity": 4975,
  "retail_price": 2500,
  "wholesale_price": 1750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-22T13:59:34.529Z"
  },
  "updatedAt": {
    "$date": "2026-01-07T13:41:39.043Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d15ab2712402657f316ddd"
  },
  "product_name": "Ben 10 winner (foam)",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 6000,
  "wholesale_price": 4500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-22T14:18:26.289Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d15b10712402657f316de4"
  },
  "product_name": "Ben 10 winner (brake foam)",
  "product_category": "Uncategorized",
  "product_quantity": 4979,
  "retail_price": 6800,
  "wholesale_price": 5400,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-22T14:20:00.007Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:01:25.598Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d15c54712402657f316de8"
  },
  "product_name": "Ben 10 loha wheel chimta",
  "product_category": "Uncategorized",
  "product_quantity": 4990,
  "retail_price": 7000,
  "wholesale_price": 5750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-22T14:25:24.668Z"
  },
  "updatedAt": {
    "$date": "2025-11-22T10:39:07.437Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d15cbe712402657f316dec"
  },
  "product_name": "single sofa reliable",
  "product_category": "Uncategorized",
  "product_quantity": 4960,
  "retail_price": 2500,
  "wholesale_price": 1690,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-22T14:27:10.138Z"
  },
  "updatedAt": {
    "$date": "2026-01-20T13:59:46.824Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d2a8b9712402657f31a447"
  },
  "product_name": "old remaining bill",
  "product_category": "Uncategorized",
  "product_quantity": 4974,
  "retail_price": 1,
  "wholesale_price": 22300,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-23T14:03:37.139Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:49:48.929Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d2aa15712402657f31c8ef"
  },
  "product_name": "Ben 10 12inch brake",
  "product_category": "Uncategorized",
  "product_quantity": 4972,
  "retail_price": 5500,
  "wholesale_price": 4250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-23T14:09:25.064Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T13:51:28.063Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d3f760712402657f324931"
  },
  "product_name": "foam walker loha",
  "product_category": "Uncategorized",
  "product_quantity": 4969,
  "retail_price": 1800,
  "wholesale_price": 1250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-24T13:51:28.398Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d3f9f5712402657f328096"
  },
  "product_name": "jeep bugy 999 (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 2800,
  "wholesale_price": 2000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-24T14:02:29.670Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T14:10:57.852Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d4008a712402657f32efa9"
  },
  "product_name": "crystal walker karachi 10 wheel (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4985,
  "retail_price": 4500,
  "wholesale_price": 2550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-24T14:30:34.164Z"
  },
  "updatedAt": {
    "$date": "2025-12-17T12:54:36.807Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d400ee712402657f32efad"
  },
  "product_name": "super walker 2 in 1 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4988,
  "retail_price": 5500,
  "wholesale_price": 3200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-24T14:32:14.454Z"
  },
  "updatedAt": {
    "$date": "2026-01-22T12:42:48.652Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d538ec712402657f33726c"
  },
  "product_name": "jhula MJ 212",
  "product_category": "Uncategorized",
  "product_quantity": 4984,
  "retail_price": 6500,
  "wholesale_price": 3850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-25T12:43:24.252Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:25:53.372Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d5399a712402657f337270"
  },
  "product_name": "MCO jhula 3 inch",
  "product_category": "Uncategorized",
  "product_quantity": 5006,
  "retail_price": 18500,
  "wholesale_price": 13800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-25T12:46:18.701Z"
  },
  "updatedAt": {
    "$date": "2025-09-27T07:34:23.228Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d7f758712402657f3430e8"
  },
  "product_name": "china best 20 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 26000,
  "wholesale_price": 19000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-27T14:40:24.259Z"
  },
  "updatedAt": {
    "$date": "2025-09-27T15:05:31.201Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d944de712402657f34b7c4"
  },
  "product_name": "Jet pro Double",
  "product_category": "Uncategorized",
  "product_quantity": 4911,
  "retail_price": 5500,
  "wholesale_price": 3500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-28T14:23:26.702Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d94561712402657f34b7c9"
  },
  "product_name": "car malak 401 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4988,
  "retail_price": 2200,
  "wholesale_price": 1450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-28T14:25:37.935Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T13:40:20.426Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d9480b712402657f34f191"
  },
  "product_name": "chargeable jeep 888",
  "product_category": "Uncategorized",
  "product_quantity": 4952,
  "retail_price": 28000,
  "wholesale_price": 19500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-28T14:36:59.066Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.847Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d94d2d712402657f353fc9"
  },
  "product_name": "carry coat 3 in 1 vip black",
  "product_category": "Uncategorized",
  "product_quantity": 4985,
  "retail_price": 3800,
  "wholesale_price": 2450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-28T14:58:53.598Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T07:48:54.393Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68d94d9c712402657f353fcd"
  },
  "product_name": "Jhula 5 rod new 1 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4992,
  "retail_price": 6000,
  "wholesale_price": 4300,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-28T15:00:44.411Z"
  },
  "updatedAt": {
    "$date": "2026-01-22T12:42:48.652Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68da8f0d712402657f36a0a5"
  },
  "product_name": "steering rod 606",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 250,
  "wholesale_price": 170,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-29T13:52:13.106Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.847Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68da8f32712402657f36a0a9"
  },
  "product_name": "seering 606",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 300,
  "wholesale_price": 250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-29T13:52:50.096Z"
  },
  "updatedAt": {
    "$date": "2025-09-29T13:56:53.742Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68da964c712402657f36f0af"
  },
  "product_name": "jeep 6188 chargeable (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 55000,
  "wholesale_price": 39500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-09-29T14:23:08.839Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T14:04:25.849Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68dcdaf9712402657f384b98"
  },
  "product_name": "jeep 369",
  "product_category": "Uncategorized",
  "product_quantity": 4962,
  "retail_price": 4800,
  "wholesale_price": 3150,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-01T07:40:41.821Z"
  },
  "updatedAt": {
    "$date": "2026-01-22T12:42:48.652Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68dd34c2712402657f386048"
  },
  "product_name": "BMX mota tyre",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 30000,
  "wholesale_price": 21500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-01T14:03:46.762Z"
  },
  "updatedAt": {
    "$date": "2025-10-27T07:32:03.484Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68dd3798712402657f388985"
  },
  "product_name": "jeep 369 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4984,
  "retail_price": 4800,
  "wholesale_price": 3000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-01T14:15:52.255Z"
  },
  "updatedAt": {
    "$date": "2025-10-23T13:21:46.708Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68de5761712402657f393055"
  },
  "product_name": "gora 3 in 1 master",
  "product_category": "Uncategorized",
  "product_quantity": 4978,
  "retail_price": 2000,
  "wholesale_price": 1460,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-02T10:43:45.978Z"
  },
  "updatedAt": {
    "$date": "2025-11-06T12:42:06.268Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68de5782712402657f393059"
  },
  "product_name": "gora 3 in 1 master music",
  "product_category": "Uncategorized",
  "product_quantity": 4990,
  "retail_price": 2000,
  "wholesale_price": 1550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-02T10:44:18.941Z"
  },
  "updatedAt": {
    "$date": "2026-01-11T10:08:56.357Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e12ddc712402657f3a422e"
  },
  "product_name": "ys sports 20 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4992,
  "retail_price": 15500,
  "wholesale_price": 12600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-04T14:23:24.788Z"
  },
  "updatedAt": {
    "$date": "2025-10-11T13:59:44.150Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e13046712402657f3a6cd8"
  },
  "product_name": "scooty china",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 9000,
  "wholesale_price": 7100,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-04T14:33:42.865Z"
  },
  "updatedAt": {
    "$date": "2025-10-07T07:55:15.767Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e13069712402657f3a6cdc"
  },
  "product_name": "scooty golden",
  "product_category": "Uncategorized",
  "product_quantity": 4990,
  "retail_price": 4200,
  "wholesale_price": 3200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-04T14:34:17.648Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T13:51:28.063Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e2044d712402657f3aad14"
  },
  "product_name": "ajwa carry cut 3 in 1 001",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 3000,
  "wholesale_price": 1950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-05T05:38:21.383Z"
  },
  "updatedAt": {
    "$date": "2025-12-08T13:28:34.406Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e2052b712402657f3aad1b"
  },
  "product_name": "Taal jhulaaaa",
  "product_category": "Uncategorized",
  "product_quantity": 4995,
  "retail_price": 1300,
  "wholesale_price": 880,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-05T05:42:03.558Z"
  },
  "updatedAt": {
    "$date": "2026-02-01T13:59:23.415Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e205b6712402657f3aad1f"
  },
  "product_name": "gora sada seat (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4994,
  "retail_price": 1250,
  "wholesale_price": 680,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-05T05:44:22.906Z"
  },
  "updatedAt": {
    "$date": "2025-10-05T05:48:43.729Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e3c5e8712402657f3b5a6f"
  },
  "product_name": "chargeable jeep 888 (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4986,
  "retail_price": 28000,
  "wholesale_price": 20500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-06T13:36:40.296Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.847Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e3ccbe712402657f3bb1d7"
  },
  "product_name": "cycle par",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 550,
  "wholesale_price": 380,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-06T14:05:50.311Z"
  },
  "updatedAt": {
    "$date": "2025-10-06T14:08:31.307Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e4aff2712402657f3c09b6"
  },
  "product_name": "gora master",
  "product_category": "Uncategorized",
  "product_quantity": 4921,
  "retail_price": 1350,
  "wholesale_price": 940,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-07T06:15:14.712Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e4c3c9712402657f3c1fef"
  },
  "product_name": "gora walker mama love",
  "product_category": "Uncategorized",
  "product_quantity": 4994,
  "retail_price": 5500,
  "wholesale_price": 3750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-07T07:39:53.014Z"
  },
  "updatedAt": {
    "$date": "2025-12-21T10:27:31.408Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e4c3f7712402657f3c1ff3"
  },
  "product_name": "baby world walker 3 in 1",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 6500,
  "wholesale_price": 4250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-07T07:40:39.064Z"
  },
  "updatedAt": {
    "$date": "2025-10-07T07:55:15.767Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e4c4ed712402657f3c1ff7"
  },
  "product_name": "scooty 68",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 8500,
  "wholesale_price": 6600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-07T07:44:45.792Z"
  },
  "updatedAt": {
    "$date": "2025-10-07T07:55:15.767Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e60b18712402657f3d2ead"
  },
  "product_name": "ben 10 p25 12 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4969,
  "retail_price": 4500,
  "wholesale_price": 3550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-08T06:56:24.094Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e60b92712402657f3d2eb1"
  },
  "product_name": "sumic 26 gear mota tyre",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 32000,
  "wholesale_price": 22500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-08T06:58:26.323Z"
  },
  "updatedAt": {
    "$date": "2026-01-14T13:59:14.286Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e60d21712402657f3d2eb5"
  },
  "product_name": "jhula chunghee black",
  "product_category": "Uncategorized",
  "product_quantity": 4993,
  "retail_price": 5500,
  "wholesale_price": 4050,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-08T07:05:05.336Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T14:12:25.410Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e60d71712402657f3d2eb9"
  },
  "product_name": "jhula 9296",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 11500,
  "wholesale_price": 6600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-08T07:06:25.769Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:25:53.372Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e65bc1712402657f3d5c62"
  },
  "product_name": "super shano sports",
  "product_category": "Uncategorized",
  "product_quantity": 4908,
  "retail_price": 15000,
  "wholesale_price": 11500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-08T12:40:33.076Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.847Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e7ade5712402657f3ef9ba"
  },
  "product_name": "general   16 inch double chimta",
  "product_category": "Uncategorized",
  "product_quantity": 4989,
  "retail_price": 8500,
  "wholesale_price": 6550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-09T12:43:17.258Z"
  },
  "updatedAt": {
    "$date": "2026-01-14T14:06:10.026Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e7b116712402657f3f1101"
  },
  "product_name": "diamond single (vip) M",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 3800,
  "wholesale_price": 2250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-09T12:56:54.909Z"
  },
  "updatedAt": {
    "$date": "2025-12-24T13:03:02.240Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68e7b16b712402657f3f1109"
  },
  "product_name": "super shano sports carrier",
  "product_category": "Uncategorized",
  "product_quantity": 4971,
  "retail_price": 15500,
  "wholesale_price": 12000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-09T12:58:19.637Z"
  },
  "updatedAt": {
    "$date": "2026-01-31T13:37:58.011Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ea2ebe712402657f3fb5fd"
  },
  "product_name": "BMX 16 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4984,
  "retail_price": 28000,
  "wholesale_price": 19500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-11T10:17:34.506Z"
  },
  "updatedAt": {
    "$date": "2026-01-04T13:20:06.668Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ea6015712402657f3fe5e3"
  },
  "product_name": "super shano sports (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 15000,
  "wholesale_price": 12500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-11T13:48:05.023Z"
  },
  "updatedAt": {
    "$date": "2025-10-28T13:04:58.673Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ebb104712402657f410110"
  },
  "product_name": "chargeable 501",
  "product_category": "Uncategorized",
  "product_quantity": 4994,
  "retail_price": 28000,
  "wholesale_price": 22000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-12T13:45:40.591Z"
  },
  "updatedAt": {
    "$date": "2026-02-01T13:59:23.415Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ecb174712402657f41a7b5"
  },
  "product_name": "world mini car",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 3000,
  "wholesale_price": 1700,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-13T07:59:48.792Z"
  },
  "updatedAt": {
    "$date": "2025-10-13T08:06:07.116Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ecb1ba712402657f41a7bc"
  },
  "product_name": "world mini car (m)",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 3000,
  "wholesale_price": 1600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-13T08:00:58.869Z"
  },
  "updatedAt": {
    "$date": "2025-10-13T08:00:58.869Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ecfe93712402657f421f6f"
  },
  "product_name": "master jeep",
  "product_category": "Uncategorized",
  "product_quantity": 4978,
  "retail_price": 1800,
  "wholesale_price": 1220,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-13T13:28:51.891Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:16:34.866Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ecfed3712402657f421f73"
  },
  "product_name": "3 in 1 korean walker",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 6500,
  "wholesale_price": 4200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-13T13:29:55.582Z"
  },
  "updatedAt": {
    "$date": "2025-11-10T13:07:23.056Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ed058e712402657f4267f5"
  },
  "product_name": "prime 2 in 1 karachi",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 6000,
  "wholesale_price": 4500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-13T13:58:38.788Z"
  },
  "updatedAt": {
    "$date": "2025-10-22T14:01:37.751Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ede676712402657f42f9f2"
  },
  "product_name": "ben 10 top rider foam",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 4500,
  "wholesale_price": 3600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-14T05:58:14.451Z"
  },
  "updatedAt": {
    "$date": "2025-10-14T06:06:01.282Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ee0751712402657f4312d3"
  },
  "product_name": "Fly mate Big",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 2800,
  "wholesale_price": 1950,
  "costPrice": 1700,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-14T08:18:25.563Z"
  },
  "updatedAt": {
    "$date": "2025-10-25T09:39:34.179Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ee0775712402657f4312d7"
  },
  "product_name": "Fly mate small",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 2500,
  "wholesale_price": 1680,
  "costPrice": 1400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-14T08:19:01.754Z"
  },
  "updatedAt": {
    "$date": "2025-10-14T10:52:19.888Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68efa988712402657f44228a"
  },
  "product_name": "Ben 10 winner brake",
  "product_category": "Uncategorized",
  "product_quantity": 4969,
  "retail_price": 6800,
  "wholesale_price": 5200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-15T14:02:48.221Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68efac03712402657f44548a"
  },
  "product_name": "spiderman hero digi",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 3000,
  "wholesale_price": 2200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-15T14:13:23.724Z"
  },
  "updatedAt": {
    "$date": "2025-10-15T14:14:06.519Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68efade6712402657f449f93"
  },
  "product_name": "walker baby world",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 5500,
  "wholesale_price": 3100,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-15T14:21:26.509Z"
  },
  "updatedAt": {
    "$date": "2026-01-01T13:47:21.322Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68f322b7712402657f45852c"
  },
  "product_name": "china 20 caspian color",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 26000,
  "wholesale_price": 16000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-18T05:16:39.730Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68f8e2d8712402657f47a4d2"
  },
  "product_name": "mercedez stroller 52",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 4500,
  "wholesale_price": 2950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-22T13:57:44.918Z"
  },
  "updatedAt": {
    "$date": "2026-01-14T13:59:14.286Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68f8e317712402657f47a4d6"
  },
  "product_name": "car abc",
  "product_category": "Uncategorized",
  "product_quantity": 4950,
  "retail_price": 4000,
  "wholesale_price": 2650,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-22T13:58:47.846Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68fa383f712402657f4967f6"
  },
  "product_name": "sprinter cycle karachi",
  "product_category": "Uncategorized",
  "product_quantity": 4971,
  "retail_price": 5500,
  "wholesale_price": 3350,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-23T14:14:23.957Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68fa3880712402657f4967fa"
  },
  "product_name": "ducking car karachi",
  "product_category": "Uncategorized",
  "product_quantity": 4990,
  "retail_price": 4000,
  "wholesale_price": 2750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-23T14:15:28.683Z"
  },
  "updatedAt": {
    "$date": "2025-12-29T06:36:29.760Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68fa38c1712402657f4967fe"
  },
  "product_name": "mercedez car karachi",
  "product_category": "Uncategorized",
  "product_quantity": 4989,
  "retail_price": 3500,
  "wholesale_price": 2350,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-23T14:16:33.597Z"
  },
  "updatedAt": {
    "$date": "2025-12-29T06:36:29.760Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68fa3a86712402657f498316"
  },
  "product_name": "walker golden",
  "product_category": "Uncategorized",
  "product_quantity": 4979,
  "retail_price": 6500,
  "wholesale_price": 4200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-23T14:24:06.375Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68fa3ae2712402657f49831a"
  },
  "product_name": "black carry coat jumbo",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 3500,
  "wholesale_price": 2250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-23T14:25:38.985Z"
  },
  "updatedAt": {
    "$date": "2025-12-31T06:46:31.753Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68fa3b93712402657f49831e"
  },
  "product_name": "carry coat golden",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 4500,
  "wholesale_price": 3150,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-23T14:28:35.014Z"
  },
  "updatedAt": {
    "$date": "2025-10-23T14:39:37.132Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68fa3cdd712402657f498322"
  },
  "product_name": "jhula minar mco 36 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 12500,
  "wholesale_price": 8500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-23T14:34:05.560Z"
  },
  "updatedAt": {
    "$date": "2025-11-10T08:50:29.788Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68fa3d30712402657f498326"
  },
  "product_name": "china super special rim 24 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 35000,
  "wholesale_price": 25500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-23T14:35:28.513Z"
  },
  "updatedAt": {
    "$date": "2025-10-23T14:39:37.132Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68fc9940712402657f49b92a"
  },
  "product_name": "swing chair",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 1000,
  "wholesale_price": 750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-25T09:32:48.329Z"
  },
  "updatedAt": {
    "$date": "2025-10-25T09:39:34.179Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68fe2092712402657f4aff0c"
  },
  "product_name": "ajwa car (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4961,
  "retail_price": 1600,
  "wholesale_price": 1200,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-26T13:22:26.635Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "68ff1f59712402657f4b5166"
  },
  "product_name": "chargeable 602",
  "product_category": "Uncategorized",
  "product_quantity": 4995,
  "retail_price": 28000,
  "wholesale_price": 19500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-27T07:29:29.883Z"
  },
  "updatedAt": {
    "$date": "2026-01-27T13:09:32.338Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69005fa6712402657f4c82b6"
  },
  "product_name": "walker 444 FA 10W",
  "product_category": "Uncategorized",
  "product_quantity": 4992,
  "retail_price": 2200,
  "wholesale_price": 1600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-28T06:16:06.008Z"
  },
  "updatedAt": {
    "$date": "2025-12-29T06:35:40.206Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69006055712402657f4c82ba"
  },
  "product_name": "sezo double rod double",
  "product_category": "Uncategorized",
  "product_quantity": 4985,
  "retail_price": 4000,
  "wholesale_price": 2750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-28T06:19:01.167Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:41:22.949Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6900c179712402657f4d2bd5"
  },
  "product_name": "champion double",
  "product_category": "Uncategorized",
  "product_quantity": 4995,
  "retail_price": 4500,
  "wholesale_price": 2850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-28T13:13:29.768Z"
  },
  "updatedAt": {
    "$date": "2025-12-24T12:50:24.510Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6900c1cf712402657f4d2bd9"
  },
  "product_name": "champion single",
  "product_category": "Uncategorized",
  "product_quantity": 4985,
  "retail_price": 3800,
  "wholesale_price": 2250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-28T13:14:55.523Z"
  },
  "updatedAt": {
    "$date": "2026-01-10T14:09:41.226Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6900c21f712402657f4d2bdd"
  },
  "product_name": "double loha wheel",
  "product_category": "Uncategorized",
  "product_quantity": 4981,
  "retail_price": 4000,
  "wholesale_price": 2580,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-28T13:16:15.361Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:28:31.224Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6900c292712402657f4d2be1"
  },
  "product_name": "single rod double loha W",
  "product_category": "Uncategorized",
  "product_quantity": 4990,
  "retail_price": 3500,
  "wholesale_price": 2450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-28T13:18:10.001Z"
  },
  "updatedAt": {
    "$date": "2026-01-19T10:42:15.288Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6900c2c3712402657f4d2be5"
  },
  "product_name": "fouji double loha",
  "product_category": "Uncategorized",
  "product_quantity": 4979,
  "retail_price": 4000,
  "wholesale_price": 2550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-28T13:18:59.972Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T12:35:56.620Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6901b9ec712402657f4d80b4"
  },
  "product_name": "504 slide",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 10500,
  "wholesale_price": 7600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-29T06:53:32.444Z"
  },
  "updatedAt": {
    "$date": "2025-10-29T06:55:25.265Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6901c2f2712402657f4d9d7f"
  },
  "product_name": "wheel 606",
  "product_category": "Uncategorized",
  "product_quantity": 4984,
  "retail_price": 250,
  "wholesale_price": 170,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-10-29T07:32:02.503Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.847Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6907643c712402657f513a07"
  },
  "product_name": "sona car chota",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 7800,
  "wholesale_price": 5750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-02T14:01:32.900Z"
  },
  "updatedAt": {
    "$date": "2026-01-11T07:11:48.685Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6908aecf712402657f522770"
  },
  "product_name": "crystal walker karachi 10 wheel (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4992,
  "retail_price": 4500,
  "wholesale_price": 2900,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-03T13:31:59.129Z"
  },
  "updatedAt": {
    "$date": "2025-12-09T13:16:58.344Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6908af31712402657f522777"
  },
  "product_name": "gora walker mama love (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4994,
  "retail_price": 5500,
  "wholesale_price": 3550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-03T13:33:37.511Z"
  },
  "updatedAt": {
    "$date": "2025-12-24T12:52:20.585Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6908afd7712402657f52277b"
  },
  "product_name": "Ben 10 12inch brake foam",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 5500,
  "wholesale_price": 4400,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-03T13:36:23.139Z"
  },
  "updatedAt": {
    "$date": "2025-11-03T13:37:59.752Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "690c9847712402657f542324"
  },
  "product_name": "24 inch stone bike gear special (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 40000,
  "wholesale_price": 29500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-06T12:44:55.516Z"
  },
  "updatedAt": {
    "$date": "2025-11-06T14:04:45.775Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69109567712402657f55542d"
  },
  "product_name": "walker 444",
  "product_category": "Uncategorized",
  "product_quantity": 4974,
  "retail_price": 2400,
  "wholesale_price": 1600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-09T13:21:43.162Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:02:29.154Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6911e808712402657f56a661"
  },
  "product_name": "super shano star rim 20 (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 22000,
  "wholesale_price": 16500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-10T13:26:32.923Z"
  },
  "updatedAt": {
    "$date": "2026-01-20T13:44:06.379Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "691dc3bb712402657f5c6ba0"
  },
  "product_name": "d single gol",
  "product_category": "Uncategorized",
  "product_quantity": 4944,
  "retail_price": 2000,
  "wholesale_price": 1450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-19T13:18:51.222Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:02:14.562Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69218fdd712402657f5f4f75"
  },
  "product_name": "parriot foam brake",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 8000,
  "wholesale_price": 5700,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-22T10:26:37.958Z"
  },
  "updatedAt": {
    "$date": "2025-11-22T10:26:37.958Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69255b67712402657f63cd83"
  },
  "product_name": "chargeable model 1900 pp",
  "product_category": "Uncategorized",
  "product_quantity": 4990,
  "retail_price": 25000,
  "wholesale_price": 18500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-25T07:31:51.973Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T14:00:12.929Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6928499f712402657f6608a7"
  },
  "product_name": "iron man",
  "product_category": "Uncategorized",
  "product_quantity": 4988,
  "retail_price": 3800,
  "wholesale_price": 2800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-27T12:52:47.791Z"
  },
  "updatedAt": {
    "$date": "2026-01-04T09:08:56.768Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "692c4996712402657f684b1c"
  },
  "product_name": "gora shahi golden",
  "product_category": "Uncategorized",
  "product_quantity": 4994,
  "retail_price": 4000,
  "wholesale_price": 2550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-11-30T13:41:42.659Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "692d8d20712402657f693a68"
  },
  "product_name": "ys china 20 specal rimm",
  "product_category": "Uncategorized",
  "product_quantity": 4981,
  "retail_price": 28000,
  "wholesale_price": 19600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-01T12:42:08.612Z"
  },
  "updatedAt": {
    "$date": "2026-01-29T14:09:50.236Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69303876712402657f6b650c"
  },
  "product_name": "D single bnd seat",
  "product_category": "Uncategorized",
  "product_quantity": 4977,
  "retail_price": 2000,
  "wholesale_price": 1450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-03T13:17:42.824Z"
  },
  "updatedAt": {
    "$date": "2026-01-20T13:44:06.379Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69357c05712402657f6fcbd3"
  },
  "product_name": "Chargeable car 91",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 28000,
  "wholesale_price": 21000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-07T13:07:17.198Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T14:26:20.148Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6936d073712402657f705b50"
  },
  "product_name": "car 69 vip",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 2800,
  "wholesale_price": 1900,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-08T13:19:47.133Z"
  },
  "updatedAt": {
    "$date": "2025-12-10T13:25:38.679Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6937f735712402657f71c367"
  },
  "product_name": "china 12 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4979,
  "retail_price": 15500,
  "wholesale_price": 11500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-09T10:17:25.478Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:40:05.020Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69397484712402657f735307"
  },
  "product_name": "single rod double nicel",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 2500,
  "wholesale_price": 1830,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-10T13:24:20.398Z"
  },
  "updatedAt": {
    "$date": "2025-12-10T13:26:48.578Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69397670712402657f73e534"
  },
  "product_name": "walker chicago",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 7500,
  "wholesale_price": 5100,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-10T13:32:32.429Z"
  },
  "updatedAt": {
    "$date": "2025-12-10T13:33:04.286Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "693d6c3d712402657f759d2d"
  },
  "product_name": "chargeable 6188 simple",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 55000,
  "wholesale_price": 37500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-13T13:38:05.121Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:49:48.929Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "694103b1712402657f765606"
  },
  "product_name": "carry cut golden",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 4000,
  "wholesale_price": 2350,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-16T07:01:05.075Z"
  },
  "updatedAt": {
    "$date": "2025-12-16T07:03:48.712Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6946a471712402657f7a9187"
  },
  "product_name": "chargeable 6188 simple (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 55000,
  "wholesale_price": 38500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-20T13:28:17.305Z"
  },
  "updatedAt": {
    "$date": "2026-01-10T14:17:31.862Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6946a60c712402657f7ab752"
  },
  "product_name": "sony zoom 16 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 15500,
  "wholesale_price": 11800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-20T13:35:08.360Z"
  },
  "updatedAt": {
    "$date": "2025-12-20T13:36:56.732Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6946a65f712402657f7ab756"
  },
  "product_name": "taal 3 in 1",
  "product_category": "Uncategorized",
  "product_quantity": 4995,
  "retail_price": 1400,
  "wholesale_price": 950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-20T13:36:31.613Z"
  },
  "updatedAt": {
    "$date": "2025-12-29T06:27:53.038Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69479d66712402657f7b4e94"
  },
  "product_name": "carry coat jumbo king (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4992,
  "retail_price": 4000,
  "wholesale_price": 2450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-21T07:10:30.041Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6947c9d7712402657f7b9a7a"
  },
  "product_name": "mercedez stroller 52 (p)",
  "product_category": "Uncategorized",
  "product_quantity": 4992,
  "retail_price": 4500,
  "wholesale_price": 3100,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-21T10:20:07.481Z"
  },
  "updatedAt": {
    "$date": "2026-01-05T13:38:58.955Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "694943d8712402657f7e0156"
  },
  "product_name": "car model 503 stroller (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 3500,
  "wholesale_price": 2450,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-22T13:12:56.097Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T11:12:28.074Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69494418712402657f7e015a"
  },
  "product_name": "20 chargeable jeep",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 38000,
  "wholesale_price": 25500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-22T13:14:00.229Z"
  },
  "updatedAt": {
    "$date": "2026-01-27T13:09:32.338Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "694a65e5712402657f7e75c5"
  },
  "product_name": "double 4x4",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 3500,
  "wholesale_price": 2400,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-23T09:50:29.776Z"
  },
  "updatedAt": {
    "$date": "2025-12-27T13:17:58.592Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "694be175712402657f7fd829"
  },
  "product_name": "car sky jet",
  "product_category": "Uncategorized",
  "product_quantity": 4982,
  "retail_price": 3500,
  "wholesale_price": 2250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2025-12-24T12:49:57.317Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T11:18:28.062Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "695a33fd712402657f8ae8de"
  },
  "product_name": "ben 10 hero 10 F Wheel",
  "product_category": "Uncategorized",
  "product_quantity": 4985,
  "retail_price": 4000,
  "wholesale_price": 3250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-04T09:33:49.015Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "695a3d74712402657f8b1208"
  },
  "product_name": "GT 310 cycle",
  "product_category": "Uncategorized",
  "product_quantity": 4967,
  "retail_price": 3500,
  "wholesale_price": 2650,
  "costPrice": 2220,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-04T10:14:12.877Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "695a3db2712402657f8b120c"
  },
  "product_name": "Mario hero cycle",
  "product_category": "Uncategorized",
  "product_quantity": 4975,
  "retail_price": 3200,
  "wholesale_price": 2000,
  "costPrice": 1650,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-04T10:15:14.030Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:22:43.596Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "695a3e11712402657f8b1210"
  },
  "product_name": "616   ranger car  |  616 رینجر کار",
  "product_category": "Uncategorized",
  "product_quantity": 4983,
  "retail_price": 2500,
  "wholesale_price": 1650,
  "costPrice": 1450,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-04T10:16:49.316Z"
  },
  "updatedAt": {
    "$date": "2026-02-05T11:38:38.898Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "695a3e2d712402657f8b1214"
  },
  "product_name": "618   ranger car  |  618 رینجر کار",
  "product_category": "Uncategorized",
  "product_quantity": 4990,
  "retail_price": 2500,
  "wholesale_price": 1650,
  "costPrice": 1450,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-04T10:17:17.361Z"
  },
  "updatedAt": {
    "$date": "2026-01-25T14:19:36.398Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "695a6f4a712402657f8cad6e"
  },
  "product_name": "philco new 2 wheeler 2025 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4995,
  "retail_price": 9500,
  "wholesale_price": 6750,
  "costPrice": 6350,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-04T13:46:50.695Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T13:40:20.426Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "695a7010712402657f8cad75"
  },
  "product_name": "crusier   18 inch (m)|  کرسیئر 18 انچ",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 8800,
  "wholesale_price": 6500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-04T13:50:08.922Z"
  },
  "updatedAt": {
    "$date": "2026-01-04T13:50:49.883Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "695bbe98712402657f8ec6d0"
  },
  "product_name": "minion car",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 4500,
  "wholesale_price": 2810,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-05T13:37:28.523Z"
  },
  "updatedAt": {
    "$date": "2026-01-12T11:12:28.074Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "695e6074712402657f91e002"
  },
  "product_name": "double rod double (m)  |  ڈبل راڈ ڈبل",
  "product_category": "Uncategorized",
  "product_quantity": 4976,
  "retail_price": 2600,
  "wholesale_price": 1950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-07T13:32:36.828Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T12:35:56.620Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "695e6095712402657f91e006"
  },
  "product_name": "double rod single (m) |  ڈبل راڈ سنگل",
  "product_category": "Uncategorized",
  "product_quantity": 4971,
  "retail_price": 2400,
  "wholesale_price": 1750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-07T13:33:09.627Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:10:46.107Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "695e61c6712402657f91e00a"
  },
  "product_name": "master car dhoom (m)m",
  "product_category": "Uncategorized",
  "product_quantity": 4990,
  "retail_price": 1300,
  "wholesale_price": 880,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-07T13:38:14.819Z"
  },
  "updatedAt": {
    "$date": "2026-01-07T13:41:39.043Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69625d63712402657f9504bb"
  },
  "product_name": "scooty 68 (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 8500,
  "wholesale_price": 6000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-10T14:08:35.695Z"
  },
  "updatedAt": {
    "$date": "2026-01-10T14:09:41.226Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6963a912712402657f965c0b"
  },
  "product_name": "be good   20 inch special rim (gear) (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 28500,
  "wholesale_price": 20500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-11T13:43:46.457Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:25:53.372Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6963aa40712402657f965c12"
  },
  "product_name": "509 chargeable jeep",
  "product_category": "Uncategorized",
  "product_quantity": 4981,
  "retail_price": 22000,
  "wholesale_price": 17500,
  "costPrice": 15500,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-11T13:48:48.321Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T14:08:28.430Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6963ad15712402657f96b26c"
  },
  "product_name": "2026 12 inch cycle",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 8500,
  "wholesale_price": 5550,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-11T14:00:53.931Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T14:02:13.895Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6964fda2712402657f983867"
  },
  "product_name": "super sk gear 20 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4991,
  "retail_price": 28000,
  "wholesale_price": 22500,
  "costPrice": 19400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-12T13:56:50.065Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T08:24:55.176Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "696500ba712402657f98bb86"
  },
  "product_name": "super sk gear 20 inch (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4996,
  "retail_price": 28000,
  "wholesale_price": 21500,
  "costPrice": 19400,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-12T14:10:02.391Z"
  },
  "updatedAt": {
    "$date": "2026-01-27T13:09:32.338Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "696b9d87712402657f9dbf95"
  },
  "product_name": "jhula mco bacha minar 5 rodd",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 9500,
  "wholesale_price": 6950,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-17T14:32:39.557Z"
  },
  "updatedAt": {
    "$date": "2026-01-17T14:38:10.029Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "696b9dae712402657f9dbf99"
  },
  "product_name": "ys 24 inch",
  "product_category": "Uncategorized",
  "product_quantity": 4997,
  "retail_price": 28000,
  "wholesale_price": 23000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-17T14:33:18.419Z"
  },
  "updatedAt": {
    "$date": "2026-02-03T14:02:14.562Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "696b9e04712402657f9dbf9d"
  },
  "product_name": "walker 444 crystal 10 wheel",
  "product_category": "Uncategorized",
  "product_quantity": 4990,
  "retail_price": 2500,
  "wholesale_price": 1750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-17T14:34:44.865Z"
  },
  "updatedAt": {
    "$date": "2026-02-04T14:39:04.549Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "696b9e1e712402657f9dbfa1"
  },
  "product_name": "car cute panda",
  "product_category": "Uncategorized",
  "product_quantity": 4993,
  "retail_price": 3500,
  "wholesale_price": 2300,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-17T14:35:10.395Z"
  },
  "updatedAt": {
    "$date": "2026-01-19T13:45:33.085Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "696ce83f712402657fa09011"
  },
  "product_name": "bmx china 16",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 23000,
  "wholesale_price": 17500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-18T14:03:43.135Z"
  },
  "updatedAt": {
    "$date": "2026-01-18T14:10:49.565Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "696e06f1712402657fa174ba"
  },
  "product_name": "walker best 12 wheel",
  "product_category": "Uncategorized",
  "product_quantity": 4995,
  "retail_price": 3000,
  "wholesale_price": 2050,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-19T10:26:57.496Z"
  },
  "updatedAt": {
    "$date": "2026-01-19T10:42:15.288Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "696e0a24712402657fa174be"
  },
  "product_name": "Foxcy 3 in 1 walker",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 6500,
  "wholesale_price": 3850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-19T10:40:36.779Z"
  },
  "updatedAt": {
    "$date": "2026-01-19T10:42:15.288Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "696e3566712402657fa2b5e6"
  },
  "product_name": "chargeable bike 3 wheel",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 23000,
  "wholesale_price": 18000,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-19T13:45:10.758Z"
  },
  "updatedAt": {
    "$date": "2026-01-19T13:45:33.085Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6970b509712402657fa62827"
  },
  "product_name": "car super karachi",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 3200,
  "wholesale_price": 2250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-21T11:14:17.006Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T11:18:28.062Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6970b53e712402657fa6282b"
  },
  "product_name": "car jaguar",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 2800,
  "wholesale_price": 2010,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-21T11:15:10.728Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T11:18:28.062Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6970b576712402657fa6282f"
  },
  "product_name": "car swift",
  "product_category": "Uncategorized",
  "product_quantity": 4990,
  "retail_price": 2600,
  "wholesale_price": 1900,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-21T11:16:06.555Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6970b5a3712402657fa62833"
  },
  "product_name": "car sparkle",
  "product_category": "Uncategorized",
  "product_quantity": 5000,
  "retail_price": 2800,
  "wholesale_price": 2150,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-21T11:16:51.837Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T11:16:51.837Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6970ddb0712402657fa685b0"
  },
  "product_name": "formula walker karachi",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 6800,
  "wholesale_price": 4800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-21T14:07:44.007Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:18:20.104Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6970ddca712402657fa685b4"
  },
  "product_name": "baby chair sofa",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 1450,
  "wholesale_price": 1080,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-21T14:08:10.662Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T14:10:57.852Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6970e16f712402657fa71275"
  },
  "product_name": "611 wheel",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 350,
  "wholesale_price": 250,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-21T14:23:43.306Z"
  },
  "updatedAt": {
    "$date": "2026-01-21T14:24:16.126Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69772070712402657faac03a"
  },
  "product_name": "mco jhula 2025",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 12500,
  "wholesale_price": 9500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-26T08:06:08.552Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:25:53.372Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69772182712402657faac03e"
  },
  "product_name": "ys china special rim 26",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 34000,
  "wholesale_price": 25800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-26T08:10:42.461Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:25:53.372Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "697721b8712402657faac042"
  },
  "product_name": "china special rim 12",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 22000,
  "wholesale_price": 16800,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-26T08:11:36.909Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:25:53.372Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6977248d712402657faac046"
  },
  "product_name": "Mastela Deluxe (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 17500,
  "wholesale_price": 13100,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-26T08:23:41.466Z"
  },
  "updatedAt": {
    "$date": "2026-01-26T08:25:53.372Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "697a153d712402657fabe011"
  },
  "product_name": "ben 10 zam zam",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 4800,
  "wholesale_price": 3750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-28T13:55:09.956Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:01:25.598Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "697a1568712402657fabe015"
  },
  "product_name": "2026 simple 12",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 6500,
  "wholesale_price": 4850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-28T13:55:52.329Z"
  },
  "updatedAt": {
    "$date": "2026-01-28T14:01:25.598Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "697b6949712402657faf0cba"
  },
  "product_name": "china 12 inch (m0",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 15500,
  "wholesale_price": 11100,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-01-29T14:06:01.161Z"
  },
  "updatedAt": {
    "$date": "2026-01-29T14:09:50.236Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "6980ab0c712402657fb306ae"
  },
  "product_name": "scooty china (m)",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 4800,
  "wholesale_price": 3500,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-02-02T13:47:56.402Z"
  },
  "updatedAt": {
    "$date": "2026-02-02T13:51:28.063Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69835832712402657fb67e33"
  },
  "product_name": "jeep bugy stroller 900",
  "product_category": "Uncategorized",
  "product_quantity": 4994,
  "retail_price": 4200,
  "wholesale_price": 2600,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-02-04T14:31:14.173Z"
  },
  "updatedAt": {
    "$date": "2026-02-07T13:32:00.085Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69873e8c712402657fb9ce2b"
  },
  "product_name": "steering 611",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 450,
  "wholesale_price": 350,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-02-07T13:30:52.458Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.847Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "69883dcc712402657fbc2ab8"
  },
  "product_name": "205 dolphin",
  "product_category": "Uncategorized",
  "product_quantity": 4998,
  "retail_price": 5500,
  "wholesale_price": 3750,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-02-08T07:39:56.516Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T07:42:14.252Z"
  },
  "__v": 0
},
{
  "_id": {
    "$oid": "698868f5712402657fbc5d9b"
  },
  "product_name": "full wheel 611",
  "product_category": "Uncategorized",
  "product_quantity": 4999,
  "retail_price": 1200,
  "wholesale_price": 850,
  "costPrice": null,
  "price_type": "retail",
  "imgUrl": null,
  "createdAt": {
    "$date": "2026-02-08T10:44:05.373Z"
  },
  "updatedAt": {
    "$date": "2026-02-08T10:44:56.847Z"
  },
  "__v": 0
}];

async function migrate() {
  console.log('🚀 Starting MongoDB to PostgreSQL migration...\n');

  // Step 1: Extract unique categories
  const uniqueCategories = [...new Set(mongoProducts.map(p => p.product_category))];
  console.log(`📦 Found ${uniqueCategories.length} unique categories`);

  // Step 2: Create category mapping (name -> id)
  const categoryMap = new Map<string, string>();

  for (const categoryName of uniqueCategories) {
    // Check if category already exists
    const existing = await db.select().from(categories).where(eq(categories.name, categoryName));
    
    if (existing.length > 0) {
      categoryMap.set(categoryName, existing[0].id);
      console.log(`  ✓ Category exists: ${categoryName}`);
    } else {
      const newId = createId();
      await db.insert(categories).values({
        id: newId,
        name: categoryName,
      });
      categoryMap.set(categoryName, newId);
      console.log(`  + Created category: ${categoryName}`);
    }
  }

  console.log(`\n📦 Processing ${mongoProducts.length} products...\n`);

  let created = 0;
  let skipped = 0;

  for (const product of mongoProducts) {
    const categoryId = categoryMap.get(product.product_category);
    
    if (!categoryId) {
      console.log(`  ⚠ Skipped (no category): ${product.product_name}`);
      skipped++;
      continue;
    }

    // Check if product already exists by name
    const existing = await db.select().from(items).where(eq(items.productName, product.product_name));
    
    if (existing.length > 0) {
      console.log(`  ⏭ Already exists: ${product.product_name.substring(0, 40)}...`);
      skipped++;
      continue;
    }

    // Create the item
    await db.insert(items).values({
      id: createId(),
      productName: product.product_name,
      categoryId: categoryId,
      quantity: product.product_quantity,
      retailPrice: String(product.retail_price),
      wholesalePrice: product.wholesale_price ? String(product.wholesale_price) : null,
      costPrice: product.costPrice ? String(product.costPrice) : null,
      priceType: product.price_type?.toUpperCase() === 'WHOLESALE' ? 'WHOLESALE' : 'RETAIL',
      imgUrl: product.imgUrl || null,
      minStockLevel: 5,
      isActive: true,
    });

    created++;
    if (created % 20 === 0) {
      console.log(`  ✓ Created ${created} products...`);
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   Created: ${created} products`);
  console.log(`   Skipped: ${skipped} products`);
}

migrate()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
