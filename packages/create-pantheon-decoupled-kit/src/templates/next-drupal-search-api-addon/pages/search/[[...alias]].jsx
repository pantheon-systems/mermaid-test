import { NextSeo } from 'next-seo';
import { isMultiLanguage } from '../../lib/isMultiLanguage.js';
import {
	getCurrentLocaleStore,
	globalDrupalStateStores,
} from '../../lib/stores';
import { getDrupalSearchResults } from '@pantheon-systems/drupal-kit';
import Layout from '../../components/layout';
import PageHeader from '../../components/page-header';
import Link from 'next/link';

export default function SearchPage({
	hrefLang,
	footerMenu,
	errorMessage,
	searchResults,
	multiLanguage,
	locale,
}) {
	return (
		<Layout footerMenu={footerMenu}>
			<NextSeo
				title="Decoupled Next Drupal Demo"
				description="Generated by create-pantheon-decoupled-kit."
				languageAlternates={hrefLang || false}
			/>{' '}
			<PageHeader title="Search Results" />
			<div className="mt-12 mx-auto max-w-[50vw]">
				{errorMessage || !searchResults ? (
					<div className="mt-12 mx-auto max-w-[50vw]">
						<p className="text-xl text-center">
							{!errorMessage
								? 'Submit a search to view matching results🦜'
								: '⚠️Unable to fetch your search results⚠️'}
						</p>
					</div>
				) : (
					<ul>
						{searchResults?.map(({ title, body, path }) => (
							<li className="prose justify-items-start mt-8" key={path?.pid}>
								<h2>{title}</h2>
								{body.summary ? (
									<div dangerouslySetInnerHTML={{ __html: body?.summary }} />
								) : null}
								<Link
									passHref
									href={`${
										multiLanguage ? `/${path?.langcode || locale}` : ''
									}${path.alias}`}
									className="font-normal underline"
								>
									Read more →
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>
		</Layout>
	);
}

export async function getServerSideProps(context) {
	const origin = process.env.NEXT_PUBLIC_FRONTEND_URL;
	const {
		locales,
		locale,
		res,
		query: { alias },
	} = context;

	// if there is more than one language in context.locales,
	// assume multilanguage is enabled.
	const multiLanguage = isMultiLanguage(locales);
	const hrefLang = locales.map((locale) => {
		return {
			hrefLang: locale,
			href: origin + '/' + locale,
		};
	});

	const store = getCurrentLocaleStore(locale, globalDrupalStateStores);

	let errorMessage;

	try {
		const footerMenu = await store.getObject({
			objectName: 'menu_items--main',
			refresh: true,
			res: context.res,
			anon: true,
		});

		const [searchTerm] = alias ? alias : [null];
		const searchResults = searchTerm
			? (
					await getDrupalSearchResults({
						apiUrl: process.env.BACKEND_URL,
						locale: locale,
						query: searchTerm,
						response: res,
					})
			  ).data.map((value) => {
					// restructure response to match expected article object structure
					return value.attributes;
			  })
			: null;

		// Do not send error unless search term is present so /search remains a valid path
		if (!searchResults && searchTerm) {
			errorMessage = true;
		}

		return {
			props: {
				footerMenu,
				hrefLang,
				multiLanguage,
				locale,
				errorMessage: errorMessage ? errorMessage : false,
				searchResults,
			},
		};
	} catch (error) {
		console.error('Unable to fetch search page: ', error);
		return {
			notFound: true,
		};
	}
}
