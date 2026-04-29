
**URL:** https://www.ncbi.nlm.nih.gov/books/NBK25500/

---

An official website of the United States government

 Here's how you know 
Log in
Access keys
NCBI Homepage
MyNCBI Homepage
Main Content
Main Navigation
Bookshelf
Search database
Books
All Databases
Assembly
Biocollections
BioProject
BioSample
Books
ClinVar
Conserved Domains
dbGaP
dbVar
Gene
Genome
GEO DataSets
GEO Profiles
GTR
Identical Protein Groups
MedGen
MeSH
NLM Catalog
Nucleotide
OMIM
PMC
Protein
Protein Clusters
Protein Family Models
PubChem BioAssay
PubChem Compound
PubChem Substance
PubMed
SNP
SRA
Structure
Taxonomy
ToolKit
ToolKitAll
ToolKitBookgh
Search term
Search
Browse Titles Advanced
Help
Disclaimer
Entrez® Programming Utilities Help [Internet].
Show details
Contents
Search term
 
	
< PrevNext >
E-utilities Quick Start

Eric Sayers, PhD.

Author Information and Affiliations

Created: December 12, 2008; Last Update: October 24, 2018.

Estimated reading time: 10 minutes

Go to:
Release Notes

Please see our Release Notes for details on recent changes and updates.

Go to:
Announcement

On December 1, 2018, NCBI will begin enforcing the use of new API keys for E-utility calls. Please see Chapter 2 for more details about this important change.

Go to:
Introduction

This chapter provides a brief overview of basic E-utility functions along with examples of URL calls. Please see Chapter 2 for a general introduction to these utilities and Chapter 4 for a detailed discussion of syntax and parameters.

Examples include live URLs that provide sample outputs.

All E-utility calls share the same base URL:

https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
Go to:
Searching a Database
Basic Searching
esearch.fcgi?db=<database>&term=<query>

Input: Entrez database (&db); Any Entrez text query (&term)

Output: List of UIDs matching the Entrez query

Example: Get the PubMed IDs (PMIDs) for articles about breast cancer published in Science in 2008

https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=science[journal]+AND+breast+cancer+AND+2008[pdat]

Storing Search Results
esearch.fcgi?db=<database>&term=<query>&usehistory=y

Input: Any Entrez text query (&term); Entrez database (&db); &usehistory=y

Output: Web environment (&WebEnv) and query key (&query_key) parameters specifying the location on the Entrez history server of the list of UIDs matching the Entrez query

Example: Get the PubMed IDs (PMIDs) for articles about breast cancer published in Science in 2008, and store them on the Entrez history server for later use

https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=science[journal]+AND+breast+cancer+AND+2008[pdat]&usehistory=y

Associating Search Results with Existing Search Results
esearch.fcgi?db=<database>&term=<query1>&usehistory=y

# esearch produces WebEnv value ($web1) and QueryKey value ($key1) 

esearch.fcgi?db=<database>&term=<query2>&usehistory=y&WebEnv=$web1

# esearch produces WebEnv value ($web2) that contains the results 
of both searches ($key1 and $key2)

Input: Any Entrez text query (&term); Entrez database (&db); &usehistory=y; Existing web environment (&WebEnv) from a prior E-utility call

Output: Web environment (&WebEnv) and query key (&query_key) parameters specifying the location on the Entrez history server of the list of UIDs matching the Entrez query

For More Information

Please see ESearch In-Depth for a full description of ESearch.

Sample ESearch Output
<?xml version="1.0" ?>
<!DOCTYPE eSearchResult PUBLIC "-//NLM//DTD eSearchResult, 11 May 2002//EN"
 "https://www.ncbi.nlm.nih.gov/entrez/query/DTD/eSearch_020511.dtd">
<eSearchResult>
<Count>255147</Count>   # total number of records matching query
<RetMax>20</RetMax># number of UIDs returned in this XML; default=20
<RetStart>0</RetStart># index of first record returned; default=0
<QueryKey>1</QueryKey># QueryKey, only present if &usehistory=y
<WebEnv>0l93yIkBjmM60UBXuvBvPfBIq8-9nIsldXuMP0hhuMH-
8GjCz7F_Dz1XL6z@397033B29A81FB01_0038SID</WebEnv> 
                  # WebEnv; only present if &usehistory=y
      <IdList>
<Id>229486465</Id>    # list of UIDs returned
<Id>229486321</Id>
<Id>229485738</Id>
<Id>229470359</Id>
<Id>229463047</Id>
<Id>229463037</Id>
<Id>229463022</Id>
<Id>229463019</Id>
<Id>229463007</Id>
<Id>229463002</Id>
<Id>229463000</Id>
<Id>229462974</Id>
<Id>229462961</Id>
<Id>229462956</Id>
<Id>229462921</Id>
<Id>229462905</Id>
<Id>229462899</Id>
<Id>229462873</Id>
<Id>229462863</Id>
<Id>229462862</Id>
</IdList>
<TranslationSet>        # details of how Entrez translated the query
    <Translation>
     <From>mouse[orgn]</From>
     <To>"Mus musculus"[Organism]</To>
    </Translation>
</TranslationSet>
<TranslationStack>
   <TermSet>
    <Term>"Mus musculus"[Organism]</Term>
    <Field>Organism</Field>
    <Count>255147</Count>
    <Explode>Y</Explode>
   </TermSet>
   <OP>GROUP</OP>
</TranslationStack>
<QueryTranslation>"Mus musculus"[Organism]</QueryTranslation>
</eSearchResult>
Searching PubMed with Citation Data
ecitmatch.cgi?db=pubmed&rettype=xml&bdata=<citations>

Input: List of citation strings separated by a carriage return (%0D), where each citation string has the following format:

journal_title|year|volume|first_page|author_name|your_key|

Output: A list of citation strings with the corresponding PubMed ID (PMID) appended.

Example: Search PubMed for the following ciations:
