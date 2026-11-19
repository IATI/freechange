// Tests for the date <-> index helpers of each resolution.

const test=require("node:test")
const assert=require("node:assert/strict")

const exchange_day=require("../js/exchange_day.js")
const exchange_month=require("../js/exchange_month.js")
const exchange_year=require("../js/exchange_year.js")

test("day indexes count days since 1970-01-01",function()
{
	assert.equal(exchange_day.date_to_idx("1970-01-01"),0)
	assert.equal(exchange_day.date_to_idx("1970-01-02"),1)
	assert.equal(exchange_day.date_to_idx("1969-12-31"),-1)
	assert.equal(exchange_day.idx_to_date(0),"1970-01-01")
	assert.equal(exchange_day.idx_to_date(-1),"1969-12-31")
})

test("month indexes count months since 1970-01",function()
{
	assert.equal(exchange_month.date_to_idx("1970-01"),0)
	assert.equal(exchange_month.date_to_idx("1971-02"),13)
	assert.equal(exchange_month.date_to_idx("2010-01-15"),480) // the day is ignored
	assert.equal(exchange_month.idx_to_date(13),"1971-02")
})

test("year indexes count years since 1970",function()
{
	assert.equal(exchange_year.date_to_idx("1970"),0)
	assert.equal(exchange_year.date_to_idx("2010-06-15"),40) // month and day are ignored
	assert.equal(exchange_year.date_to_idx("1939"),-31)
	assert.equal(exchange_year.idx_to_date(-31),"1939")
})

test("dates round trip through their index",function()
{
	for(let date of ["1940-01-31","1999-12-31","2000-02-29","2026-10-15"])
	{
		assert.equal(exchange_day.idx_to_date(exchange_day.date_to_idx(date)),date)
	}
	for(let date of ["1970-01","1999-12","2026-10"])
	{
		assert.equal(exchange_month.idx_to_date(exchange_month.date_to_idx(date)),date)
	}
	for(let date of ["1940","2026"])
	{
		assert.equal(exchange_year.idx_to_date(exchange_year.date_to_idx(date)),date)
	}
})

test("a missing or unparseable date means today",function()
{
	let now=new Date()
	let today=Math.floor(now.getTime()/(24*60*60*1000))
	let idx=exchange_day.date_to_idx()
	assert.ok(idx===today || idx===today+1) // allow for crossing midnight
	assert.equal(exchange_day.date_to_idx("not a date"),idx)
	assert.equal(exchange_year.date_to_idx(),now.getUTCFullYear()-1970)
})

test("month idx_to_date handles months before 1970",{todo:"returns 1969-00 for idx -1, so negative indexes do not round trip"},function()
{
	assert.equal(exchange_month.idx_to_date(-1),"1969-12")
	assert.equal(exchange_month.date_to_idx(exchange_month.idx_to_date(-361)),-361)
})
