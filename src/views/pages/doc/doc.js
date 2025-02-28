/* global REPO */

import React from 'react'
import PropTypes from 'prop-types'
import marked from 'marked'
import * as timeago from 'timeago.js'
import Skeleton from '@material-ui/lab/Skeleton'
import ImmutablePropTypes from 'react-immutable-proptypes'
import Button from '@material-ui/core/Button'
import Avatar from '@material-ui/core/Avatar'
import AvatarGroup from '@material-ui/lab/AvatarGroup'
import Tooltip from '@material-ui/core/Tooltip'

import Menu from '@components/menu'

import './doc.styl'

export default class DocPage extends React.Component {
  componentDidMount() {
    this.props.getDoc(this.props.location.pathname)
  }

  componentDidUpdate(prevProps) {
    const location = JSON.stringify(this.props.location)
    const prevLocation = JSON.stringify(prevProps.location)
    if (location !== prevLocation) {
      this.props.getDoc(this.props.location.pathname)
    }
  }

  render() {
    const { doc } = this.props

    const author = doc.getIn(['commit', 'commit', 'author', 'name'])
    const lastUpdated = doc.getIn(['commit', 'commit', 'author', 'date'])
    const commitHref = doc.getIn(['commit', 'html_url'])

    const authors = []
    doc.get('authors').forEach((author, index) => {
      authors.push(
        <Tooltip key={index} title={author.login}>
          <Avatar alt={author.login} src={author.avatar_url} />
        </Tooltip>
      )
    })

    if (doc.isPending) {
      return (
        <>
          <div className='doc__content'>
            <Skeleton height={80} width={200} />
            <Skeleton height={20} />
            <Skeleton height={20} animation={false} />
            <Skeleton height={20} animation='wave' />
            <Skeleton height={20} />
            <Skeleton height={30} width={300} style={{ marginTop: '32px' }} />
            <Skeleton height={20} animation={false} />
            <Skeleton height={20} animation='wave' />
            <Skeleton height={20} />
            <Skeleton height={20} animation={false} />
            <Skeleton height={20} animation='wave' />
          </div>
          <Menu />
        </>
      )
    } else if (doc.isLoaded && !doc.content) {
      return (
        <>
          <div className='doc__content'>
            <h1>404</h1>
            <p>Document not found</p>
          </div>
          <Menu />
        </>
      )
    } else {
      const html = marked(doc.content)
      return (
        <>
          <div
            className='doc__content'
            dangerouslySetInnerHTML={{ __html: html }}></div>
          <div className='doc__content-side'>
            <Button
              variant='outlined'
              href={`https://github.com/${REPO}/tree/main/docs/${this.props.location.pathname}.md`}
              target='_blank'
              className='doc__content-edit'>
              Edit Page
            </Button>
            {Boolean(author) && (
              <div className='doc__content-author'>
                updated by{' '}
                <a href={commitHref} target='_blank'>
                  {author} {timeago.format(lastUpdated)}
                </a>
              </div>
            )}
            {Boolean(authors.length) && (
              <AvatarGroup max={6}>{authors}</AvatarGroup>
            )}
            {Boolean(authors.length) && (
              <div className='doc__content-contributors'>
                {authors.length} Contibutor{authors.length !== 1 ? 's' : ''}.{' '}
                <a
                  href='https://github.com/mistakia/nano-community/blob/main/CONTRIBUTING.md'
                  target='_blank'>
                  Help out
                </a>
              </div>
            )}
            <Menu />
          </div>
        </>
      )
    }
  }
}

DocPage.propTypes = {
  getDoc: PropTypes.func,
  location: PropTypes.object,
  doc: ImmutablePropTypes.record
}
