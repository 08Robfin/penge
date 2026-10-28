# Budsjett fra lønning til lønning
Penge viser nå én uavhengig lønningsperiode av gangen. Dette erstatter fremtidskurven i grensesnittet.

## Perioden
Velg en gjentakende hovedinntekt som lønningsplan. Perioden starter på utbetalingsdagen og slutter dagen før neste utbetaling av denne inntekten. Andre inntekter som utbetales innenfor perioden legges til. Flere inntekter betyr derfor ikke automatisk flere perioder; inntekten valgt i oppsettet styrer grensene.

Månedslønn den 12. gir for eksempel 12. november–11. desember. En regning med forfall 1. desember skal dekkes av denne lønningen. Neste lønningsdag hører utelukkende til neste periode. Ukentlig lønn og hver 14. dag følger samme regel. Månedens 29.–31. avkortes til siste dag i korte måneder og går deretter tilbake til opprinnelig dag.

Når første lønning ligger frem i tid, velges den første kommende perioden, slik at en tom inneværende kalendermåned ikke ser ut som en ødelagt beregning. Uten en gjentakende inntekt brukes foreløpig kalendermåneder med en tydelig oppsettshjelp. Engangsinntekter gjøres aldri automatisk gjentakende. Eksisterende startdatoer endres ikke.

## Til overs
Sum inntekter med utbetalingsdato i perioden
minus regninger, abonnementer og lånebetalinger med forfall i perioden
minus spareoverføringer
minus avsetninger og udekkede engangskjøp
plus eventuelle frigjorte planmidler og et manuelt bekreftet restbeløp.

Hver periode starter med 0 kr. Et beregnet overskudd overføres aldri automatisk. Tidligere månedsavstemminger beholdes i eksporten, men brukes ikke automatisk av lønningsmodellen. Bare et eksplisitt beløp i settings.periodCarry med nøyaktig periodens startdato tas med. Det beløpet gjelder bare den ene perioden.

Til overs er et budsjett for det som ennå kan gå til hverdag og småkjøp, ikke en påstand om bankens saldo. «Betalt» viser gjennomføring og lager ikke en ny utgift. Avtaler som starter etter perioden trekkes først fra når de faktisk begynner.

## Regninger, abonnementer, lån og sparing
Regninger og abonnementer er begge utgifter. Kategoriene hjelper med oversikt; samme betaling skal ikke registreres begge steder. Vanlige utgifter og abonnementer redigeres med dato og gjentakelse.

Lån har egen posttype med registrert restgjeld, saldoens dato og minste terminbeløp. Bare terminbeløpet trekkes fra budsjettet, aldri hele restgjelden. En delbetaling lavere enn minimum frigjør ikke det ubetalte minstebeløpet; beløpet står fortsatt avsatt og merkes delvis betalt. Betaling over minimum trekkes med faktisk beløp. Restgjeld oppdateres manuelt; betalinger kan omfatte renter/gebyrer, så hele betalingen trekkes ikke automatisk fra gjelden. Penge beregner ikke amortisering eller bankbekreftet restgjeld.

Sparekonto er en beholder for allerede oppsparte penger og trekker ikke startsaldoen fra lønningen på nytt. En spareavtale er overføringen som reduserer til overs. Bare fullførte overføringer øker brukerført saldo. Daterte saldojusteringer er ikke ny lønn.

## Endringer og betalinger
Penger er validerte heltall i øre. UI viser norske kroner; beregningene bruker ikke flyttall. Gjentakelser er forankret i første dato. En forekomst identifiseres med bruker, post og dato.

Vanlig redigering av et eksisterende gjentakende beløp lager en datert beløpsendring fra valgt dato. Tidligere grunnbeløp og endringer bevares. Betalte forekomsters forventede/faktiske beløp beholdes uavhengig av senere endringer.

## Planer
Månedlige planavsetninger plasseres på hovedlønnens dag i måneden ved månedlig hovedlønn, ellers på planens opprinnelige dag. Datoen begrenses av planstart og måldato. Hver avsetning hører til nøyaktig én lønningsperiode. En plan med kjøp før neste lønning kan derfor kreve flere månedsavsetninger fra samme lønning.

Lik fordeling bruker heltallsavrunding med eksakt rest. Alternativene er hele beløpet i én valgt måned eller egne månedsbeløp. Penger som allerede er reservert trekkes ikke på nytt; ved kjøpet trekkes bare en eventuell udekket del. Fullføring og avbrudd avregnes på valgt dato. Avsetninger er budsjettanslag og må kontrolleres mot faktiske reserver før kjøp. Prioritet er en etikett, ikke automatisk finansiering.

## Kompatibilitet
JSON-eksport er versjon 2. Versjon 1 importeres fortsatt og får sikre standarder for lønningsinnstillinger. Lønningsplanens ID remappes sammen med inntekts-ID-ene ved full import. Historiske månedlige beregningshjelpere beholdes for kompatibilitet og regresjonstester; grensesnittet bruker lønningsberegningen.
