'use client'

// react:
import {
    // react:
    type default as React,
}                           from 'react'

// reusable-ui components:
import {
    // dialog-components:
    type ModalExpandedChangeEvent,
}                           from '@reusable-ui/components'          // a set of official Reusable-UI components

// models:
import {
    type Model,
    type MutationArgs,
}                           from '@/models'



// types:
export type KeyOfModel<TModel extends Model>   = Exclude<keyof TModel, 'id'> // all Model's keys except id
export type ValueOfModel<TModel extends Model> = TModel[KeyOfModel<TModel>]  // union values of Model's keys except id
export type SimpleEditModelDialogResult<TModel extends Model> = ValueOfModel<TModel>|undefined // ValueOfModel<TModel>: created|updated; undefined: not created|modified
export interface SimpleEditModelDialogExpandedChangeEvent<TModel extends Model> extends ModalExpandedChangeEvent<SimpleEditModelDialogResult<TModel>> {}

export type InitialValueHandler  <TModel extends Model, TEdit extends keyof any = KeyOfModel<TModel>> = (                             edit: TEdit, model: TModel) => ValueOfModel<TModel>
export type TransformValueHandler<TModel extends Model, TEdit extends keyof any = KeyOfModel<TModel>> = (value: ValueOfModel<TModel>, edit: TEdit, model: TModel) => MutationArgs<TModel>

export type AfterUpdateHandler                          = () => void|Promise<void>

export type UpdateSideHandler                           = () => void|Promise<void>
export type DeleteSideHandler                           = () => void|Promise<void>

export type ConfirmUnsavedHandler<TModel extends Model> = (args: { model: TModel|null }) => { title?: React.ReactNode, message: React.ReactNode }
