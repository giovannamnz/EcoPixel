# The CO₂ estimate

`co2_saved_grams` is the estimated mass of CO₂-equivalent that was **not** emitted because the
WebP is smaller than the original.

## The formula

```text
co2_saved_grams = bytes_saved / 1,000,000,000   (gigabytes)
                  x 0.81                        (kWh per gigabyte transferred)
                  x 442                         (grams of CO2e per kWh)
```

That is roughly **0.36 g of CO₂e for every megabyte** that did not have to be uploaded.

The two constants follow the style of the Sustainable Web Design model. Check them against
the current version of that model before quoting the numbers anywhere.

## An example

Converting a photo that saves 150 KB:

```text
150,000 / 1,000,000,000 x 0.81 x 442  =  about 0.054 g CO2e
```

That is tiny for one image. The idea is that it adds up: under the same assumptions, a million
such images would avoid about 54 kg of CO₂e.

## What the number does and does not include

- It counts only the **network transfer** that was avoided.
- It does **not** include the energy the visitor's device spends doing the conversion.
- It is `0` whenever the WebP is not smaller than the original, so the library never claims
  savings it did not achieve.
- It is an estimate based on averages, not a measurement of any real network or power grid.

When you show the number to users, label it as an estimate.
